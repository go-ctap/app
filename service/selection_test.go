package service

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
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
		inventoryRuntime,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		if opens.Add(1) == 1 {
			close(firstOpen)
			<-releaseFirst
			return openedFor("device-1", firstRuntime), nil
		}
		return openedFor("device-2", secondRuntime), nil
	}

	results := make(chan SelectionSnapshot, 2)
	go func() {
		result, _ := service.SetSelection(t.Context(), SelectionRequest{AttachmentID: "device-1"})
		results <- result
	}()
	<-firstOpen
	go func() {
		result, _ := service.SetSelection(t.Context(), SelectionRequest{AttachmentID: "device-1"})
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
	if service.selected == nil || service.selected.device.Attachment.ID != "device-2" {
		t.Fatalf("final selection = %#v, want device-2", service.selected)
	}

	stale, err := service.ListCredentials(t.Context(), CredentialListRequest{
		OperationRequest: OperationRequest{SelectionID: first.Selection.ID},
	})
	if err != nil || stale.Error == nil || stale.Error.Code != failure.CodeAuthenticatorClosed {
		t.Fatalf("stale operation = (%#v, %v), want %s", stale, err, failure.CodeAuthenticatorClosed)
	}
}

func TestSetSelectionCancellationAndCloseFailures(t *testing.T) {
	service := selectionTestService()
	firstRuntime := &fakeAuthenticatorRuntime{closeErr: errors.New("first close failed")}
	secondRuntime := &fakeAuthenticatorRuntime{closeErr: errors.New("second close failed")}
	var opens atomic.Int32
	service.openAuthenticator = func(
		context.Context,
		inventoryRuntime,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		if opens.Add(1) == 1 {
			return openedFor("device-1", firstRuntime), nil
		}
		return openedFor("device-2", secondRuntime), nil
	}
	mustSelect(t, service, "device-1")

	release, err := service.lockSelection(t.Context())
	if err != nil {
		t.Fatalf("acquire selection: %v", err)
	}
	canceled, cancel := context.WithCancel(t.Context())
	cancel()
	_, err = service.SetSelection(canceled, SelectionRequest{AttachmentID: "device-2"})
	release()
	if !failure.IsCode(err, failure.CodeOperationCanceled) || opens.Load() != 1 {
		t.Fatalf("canceled selection = %v, opens = %d", err, opens.Load())
	}

	mustSelect(t, service, "device-2")
	if service.selected.device.Attachment.ID != "device-2" || !firstRuntime.closed.Load() {
		t.Fatalf("selection = %#v, old closed = %v", service.selected, firstRuntime.closed.Load())
	}
	snapshot, err := service.SetSelection(t.Context(), SelectionRequest{})
	if err == nil {
		t.Fatal("clear unexpectedly ignored authenticator close failure")
	}
	if snapshot.Selection != nil || service.selected != nil {
		t.Fatalf("clear = (%#v, %v), selected = %#v", snapshot, err, service.selected)
	}
}

func TestCloseSelectionClosesRuntimeBeforeWaitingForOperations(t *testing.T) {
	service := selectionTestService()
	operationID := OperationID("operation-1")
	selected := newSelection("selection-1", openedFor("device-1", &fakeAuthenticatorRuntime{}))
	operation := &operationState{
		id:          operationID,
		selectionID: selected.id,
		cancel:      func() {},
		done:        make(chan struct{}),
	}
	selected.operations[operationID] = operation
	selected.runtime.lifecycle = &fakeAuthenticatorRuntime{onClose: func() {
		service.unregisterOperation(selected, operationID)
	}}

	closeDone := make(chan error, 1)
	go func() { closeDone <- service.closeSelection(selected) }()

	select {
	case err := <-closeDone:
		if err != nil {
			t.Fatalf("closeSelection: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("closeSelection waited for the operation before closing the runtime")
	}
}

func selectionTestService() *Service {
	service := New()
	service.devices = []report.DeviceReport{testDevice("device-1"), testDevice("device-2")}
	service.inventory = newFakeInventory(service.devices)
	service.inventoryMode = transport.ModeAuto

	return service
}

func mustSelect(t *testing.T, service *Service, attachmentID report.AttachmentID) ActiveSelection {
	t.Helper()

	snapshot, err := service.SetSelection(t.Context(), SelectionRequest{AttachmentID: attachmentID})
	if err != nil {
		t.Fatalf("SetSelection(%q): %v", attachmentID, err)
	}
	if snapshot.Selection == nil {
		t.Fatalf("SetSelection(%q) returned no selection", attachmentID)
	}

	return *snapshot.Selection
}

func openedFor(id report.AttachmentID, lifecycle authenticatorLifecycle) openedAuthenticator {
	return openedAuthenticator{
		lifecycle: lifecycle,
		device:    testDevice(id),
	}
}

func testDevice(id report.AttachmentID) report.DeviceReport {
	return report.DeviceReport{
		Attachment: report.AttachmentReport{
			ID:        id,
			Transport: transport.ModeHID,
		},
		Resolution: report.IdentityResolution{State: report.IdentityUnavailable},
	}
}

type fakeAuthenticatorRuntime struct {
	closed   atomic.Bool
	closeErr error
	onClose  func()
}

func (r *fakeAuthenticatorRuntime) Close() error {
	r.closed.Store(true)
	if r.onClose != nil {
		r.onClose()
	}
	return r.closeErr
}

func (r *fakeAuthenticatorRuntime) Closed() bool {
	return r.closed.Load()
}
