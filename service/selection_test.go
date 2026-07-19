package service

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
)

func TestSetSelectionSerializesAndReuses(t *testing.T) {
	service := selectionTestService()
	firstRuntime := &fakeAuthenticatorRuntime{}
	secondRuntime := &fakeAuthenticatorRuntime{}
	firstOpen := make(chan struct{})
	releaseFirst := make(chan struct{})
	var opens atomic.Int32
	service.openAuthenticator = func(
		context.Context,
		ctapkit.Device,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		if opens.Add(1) == 1 {
			close(firstOpen)
			<-releaseFirst

			return openedAuthenticator{lifecycle: firstRuntime}, nil
		}

		return openedAuthenticator{lifecycle: secondRuntime}, nil
	}

	results := make(chan SelectionSnapshot, 2)
	go func() {
		result, _ := service.SetSelection(t.Context(), SelectionRequest{Selector: "device-1"})
		results <- result
	}()
	<-firstOpen
	go func() {
		result, _ := service.SetSelection(t.Context(), SelectionRequest{Selector: "device-1"})
		results <- result
	}()
	close(releaseFirst)

	first := <-results
	second := <-results
	if first.Selection == nil || second.Selection == nil || first.Selection.ID != second.Selection.ID {
		t.Fatalf("concurrent selections = (%#v, %#v), want one selection", first, second)
	}

	if opens.Load() != 1 {
		t.Fatalf("physical opens = %d, want 1", opens.Load())
	}

	replacement := mustSelect(t, service, "device-2")
	if replacement.ID == first.Selection.ID || !firstRuntime.closed.Load() {
		t.Fatalf("replacement = %#v, old closed = %v", replacement, firstRuntime.closed.Load())
	}

	if service.selected == nil || service.selected.device.Fingerprint != "device-2" {
		t.Fatalf("final selection = %#v, want device-2", service.selected)
	}

	stale, err := service.ListCredentials(t.Context(), CredentialListRequest{
		OperationRequest: OperationRequest{SelectionID: first.Selection.ID},
	})
	if err != nil || stale.Error == nil || stale.Error.Code != failure.CodeSelectionInvalid {
		t.Fatalf("stale operation = (%#v, %v), want %s", stale, err, failure.CodeSelectionInvalid)
	}
}

func TestSetSelectionCancellationAndCloseFailures(t *testing.T) {
	service := selectionTestService()
	firstRuntime := &fakeAuthenticatorRuntime{closeErr: errors.New("first close failed")}
	secondRuntime := &fakeAuthenticatorRuntime{closeErr: errors.New("second close failed")}
	var opens atomic.Int32
	service.openAuthenticator = func(
		context.Context,
		ctapkit.Device,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		if opens.Add(1) == 1 {
			return openedAuthenticator{lifecycle: firstRuntime}, nil
		}

		return openedAuthenticator{lifecycle: secondRuntime}, nil
	}
	mustSelect(t, service, "device-1")

	release, err := service.lockSelection(t.Context())
	if err != nil {
		t.Fatalf("acquire selection: %v", err)
	}
	canceled, cancel := context.WithCancel(t.Context())
	cancel()
	_, err = service.SetSelection(canceled, SelectionRequest{Selector: "device-2"})
	release()
	if !failure.IsCode(err, failure.CodeOperationCanceled) || opens.Load() != 1 {
		t.Fatalf("canceled selection = %v, opens = %d", err, opens.Load())
	}

	mustSelect(t, service, "device-2")
	if service.selected.device.Fingerprint != "device-2" || !firstRuntime.closed.Load() {
		t.Fatalf("selection = %#v, old closed = %v", service.selected, firstRuntime.closed.Load())
	}
	snapshot, err := service.SetSelection(t.Context(), SelectionRequest{})
	if err == nil || snapshot.Selection != nil || service.selected != nil {
		t.Fatalf("clear = (%#v, %v), selected = %#v", snapshot, err, service.selected)
	}
}

func selectionTestService() *Service {
	service := New()
	service.resolveDevice = func(_ []ctapkit.Device, selector string) (selectedDevice, error) {
		return selectedDevice{report: testDevice("hid://"+selector, selector)}, nil
	}

	return service
}

func mustSelect(t *testing.T, service *Service, selector string) ActiveSelection {
	t.Helper()

	snapshot, err := service.SetSelection(t.Context(), SelectionRequest{Selector: selector})
	if err != nil {
		t.Fatalf("SetSelection(%q): %v", selector, err)
	}

	if snapshot.Selection == nil {
		t.Fatalf("SetSelection(%q) returned no selection", selector)
	}

	return *snapshot.Selection
}
