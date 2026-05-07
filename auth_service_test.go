package main

import (
	"context"
	"errors"
	"testing"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/report"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type fakeSession struct {
	runCount   int
	closeCount int
	runErr     error
	block      chan struct{}
	closeHook  func()
}

func (s *fakeSession) Run(context.Context, model.Operation, model.InteractionHandler, ...ctapkit.RunOption) (model.OperationResult, error) {
	s.runCount++
	if s.block != nil {
		<-s.block
	}
	return nil, s.runErr
}

func (s *fakeSession) Close() error {
	s.closeCount++
	if s.closeHook != nil {
		s.closeHook()
	}
	return nil
}

func (s *fakeSession) Info() model.SessionInfo {
	return model.SessionInfo{
		Device: report.DeviceReport{DeviceID: "token-1"},
		Closed: s.closeCount > 0,
	}
}

func seedOpenSession(service *AuthenticatorService, selector string, session sessionHandle, state sessionLifecycleState) {
	service.selectedSelector = selector
	service.selectedDevice = &report.DeviceReport{DeviceID: selector}
	service.session = session
	service.sessionState = state
}

func assertCompletes(t *testing.T, name string, fn func()) {
	t.Helper()
	done := make(chan struct{})
	go func() {
		defer close(done)
		fn()
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatalf("%s did not return", name)
	}
}

func TestOperationErrorPreservesRuntimeCategory(t *testing.T) {
	err := operationError(model.NewRuntimeError(model.ErrorBusy, "device is busy", errors.New("busy")))
	if err == nil {
		t.Fatal("expected operation error")
	}
	if err.Category != model.ErrorBusy {
		t.Fatalf("category = %q, want %q", err.Category, model.ErrorBusy)
	}
	if err.Hint == "" {
		t.Fatal("expected actionable hint for busy errors")
	}
}

func TestReconcileSelectionAutoSelectsSingleDevice(t *testing.T) {
	reports := []report.DeviceReport{{DeviceID: "device-1", OrdinalAlias: "1"}}
	if got := reconcileSelectionLocked("", reports); got != "device-1" {
		t.Fatalf("selection = %q, want device-1", got)
	}
}

func TestInteractionHandlerResolvesAnswer(t *testing.T) {
	service := NewAuthenticatorService()
	handler := service.interactionHandler("op-test")
	resolved := make(chan model.InteractionResponse, 1)

	go func() {
		response, _ := handler.RequestInteraction(model.InteractionRequest{Kind: model.InteractionKindPIN})
		resolved <- response
	}()

	var interactionID string
	deadline := time.After(time.Second)
	for interactionID == "" {
		select {
		case <-deadline:
			t.Fatal("interaction was not registered")
		default:
			service.mu.Lock()
			for id := range service.interactions {
				interactionID = id
			}
			service.mu.Unlock()
			time.Sleep(time.Millisecond)
		}
	}

	if !service.ResolveInteraction(nil, InteractionAnswer{InteractionID: interactionID, PIN: "1234", Confirmed: true}) {
		t.Fatal("expected interaction to resolve")
	}

	select {
	case response := <-resolved:
		if string(response.PIN) != "1234" || !response.Confirmed {
			t.Fatalf("unexpected response: %#v", response)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not receive resolved interaction")
	}
}

func TestCancelOperationResolvesPendingInteraction(t *testing.T) {
	service := NewAuthenticatorService()
	handler := service.interactionHandler("op-cancel")
	resolved := make(chan model.InteractionResponse, 1)

	go func() {
		response, _ := handler.RequestInteraction(model.InteractionRequest{Kind: model.InteractionKindConfirm})
		resolved <- response
	}()

	deadline := time.After(time.Second)
	for {
		service.mu.Lock()
		pending := len(service.interactions)
		service.mu.Unlock()
		if pending > 0 {
			break
		}
		select {
		case <-deadline:
			t.Fatal("interaction was not registered")
		default:
			time.Sleep(time.Millisecond)
		}
	}

	if !service.CancelOperation(nil, "op-cancel") {
		t.Fatal("expected cancel to resolve pending interaction")
	}

	select {
	case response := <-resolved:
		if !response.Canceled {
			t.Fatalf("expected canceled response: %#v", response)
		}
	case <-time.After(time.Second):
		t.Fatal("handler did not receive cancellation")
	}
}

func TestRunUsesAppContextAndReusesSelectedSession(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{}
	openCalls := 0
	openCtx := make(chan context.Context, 1)
	if err := service.ServiceStartup(context.Background(), application.ServiceOptions{}); err != nil {
		t.Fatalf("startup: %v", err)
	}
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return []ctapkit.Device{{}}, nil
	}
	service.selectDevice = func(_ []ctapkit.Device, selector string) (ctapkit.Device, error) {
		if selector != "token-1" {
			t.Fatalf("selector = %q, want token-1", selector)
		}
		return ctapkit.Device{}, nil
	}
	service.openSession = func(ctx context.Context, _ ctapkit.Device, _ ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		openCtx <- ctx
		return session, nil
	}

	rpcCtx, cancel := context.WithCancel(context.Background())
	cancel()
	first := service.Inspect(rpcCtx, OperationRequest{Selector: "token-1"})
	second := service.ListCredentials(rpcCtx, OperationRequest{Selector: "token-1"})

	if first.Error != nil || second.Error != nil {
		t.Fatalf("unexpected errors: %#v %#v", first.Error, second.Error)
	}
	if openCalls != 1 {
		t.Fatalf("open calls = %d, want 1", openCalls)
	}
	select {
	case ctx := <-openCtx:
		if ctx.Err() != nil {
			t.Fatalf("open context was canceled: %v", ctx.Err())
		}
	default:
		t.Fatal("open context was not captured")
	}
	if session.runCount != 2 {
		t.Fatalf("run count = %d, want 2", session.runCount)
	}
	if service.SessionStatus(nil).State != sessionStateReady {
		t.Fatalf("state = %q, want ready", service.SessionStatus(nil).State)
	}
}

func TestSelectClosesOldSessionWithoutOpeningNewSession(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	openCalls := 0
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		return &fakeSession{}, nil
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateReady)

	response := service.Select(nil, "token-2")

	if response.Error != nil {
		t.Fatalf("unexpected select error: %#v", response.Error)
	}
	if oldSession.closeCount != 1 {
		t.Fatalf("old close count = %d, want 1", oldSession.closeCount)
	}
	if openCalls != 0 {
		t.Fatalf("open calls = %d, want 0", openCalls)
	}
	if response.Session.State != sessionStateClosed {
		t.Fatalf("state = %q, want closed", response.Session.State)
	}
	if service.session != nil {
		t.Fatal("expected service to have no open session")
	}
}

func TestSelectDoesNotOpenSession(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	openCalls := 0
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		return nil, model.NewRuntimeError(model.ErrorPermissionDenied, "cannot open selected token", nil)
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateReady)

	response := service.Select(nil, "token-2")

	if oldSession.closeCount != 1 {
		t.Fatalf("old close count = %d, want 1", oldSession.closeCount)
	}
	if response.Error != nil {
		t.Fatalf("error = %#v, want nil", response.Error)
	}
	if openCalls != 0 {
		t.Fatalf("open calls = %d, want 0", openCalls)
	}
	if response.Session.State != sessionStateClosed {
		t.Fatalf("state = %q, want closed", response.Session.State)
	}
}

func TestDiscoverDoesNotOpenSession(t *testing.T) {
	service := NewAuthenticatorService()
	openCalls := 0
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return []ctapkit.Device{{}}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		return &fakeSession{}, nil
	}

	response := service.Discover(nil, DiscoverRequest{})

	if response.Error != nil {
		t.Fatalf("unexpected discover error: %#v", response.Error)
	}
	if openCalls != 0 {
		t.Fatalf("open calls = %d, want 0", openCalls)
	}
	if response.Session.State != sessionStateIdle {
		t.Fatalf("state = %q, want idle", response.Session.State)
	}
}

func TestSelectCancelsActiveOperationAndPendingInteraction(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	ctx, cancel := context.WithCancel(context.Background())
	interaction := make(chan InteractionAnswer, 1)
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		return &fakeSession{}, nil
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateRunning)
	service.activeOperation = "op-running"
	service.activeCancel = cancel
	service.interactions["op-running:pin"] = interaction

	response := service.Select(nil, "token-2")

	if response.Error != nil {
		t.Fatalf("unexpected select error: %#v", response.Error)
	}
	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("active operation was not canceled")
	}
	select {
	case answer := <-interaction:
		if !answer.Canceled {
			t.Fatalf("interaction answer = %#v, want canceled", answer)
		}
	case <-time.After(time.Second):
		t.Fatal("pending interaction was not canceled")
	}
	if oldSession.closeCount != 1 {
		t.Fatalf("old close count = %d, want 1", oldSession.closeCount)
	}
	if response.Session.State != sessionStateClosed {
		t.Fatalf("state = %q, want closed", response.Session.State)
	}
}

func TestRunInvalidSessionMarksSessionStale(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{
		runErr: model.NewRuntimeError(model.ErrorInvalidSession, "lease expired", nil),
	}
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return []ctapkit.Device{{}}, nil
	}
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		return session, nil
	}

	envelope := service.Inspect(nil, OperationRequest{Selector: "token-1"})

	if envelope.Error == nil || envelope.Error.Category != model.ErrorInvalidSession {
		t.Fatalf("error = %#v, want invalid-session", envelope.Error)
	}
	if session.closeCount != 1 {
		t.Fatalf("close count = %d, want 1", session.closeCount)
	}
	if envelope.Session.State != sessionStateStale {
		t.Fatalf("state = %q, want stale", envelope.Session.State)
	}
}

func TestLockSessionClosesHandleAndKeepsSelection(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{}
	seedOpenSession(service, "token-1", session, sessionStateReady)

	status := service.LockSession(nil)

	if session.closeCount != 1 {
		t.Fatalf("close count = %d, want 1", session.closeCount)
	}
	if status.SelectedSelector != "token-1" {
		t.Fatalf("selector = %q, want token-1", status.SelectedSelector)
	}
	if status.State != sessionStateClosed {
		t.Fatalf("state = %q, want closed", status.State)
	}
}

func TestLockSessionDoesNotHoldMutexWhileClosingSession(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{
		closeHook: func() {
			service.mu.Lock()
			service.mu.Unlock()
		},
	}
	seedOpenSession(service, "token-1", session, sessionStateReady)

	assertCompletes(t, "LockSession", func() {
		service.LockSession(nil)
	})
}

func TestOpenSessionReopensSessionAfterLock(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	newSession := &fakeSession{}
	openCalls := 0
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return []ctapkit.Device{{}}, nil
	}
	service.selectDevice = func(_ []ctapkit.Device, selector string) (ctapkit.Device, error) {
		if selector != "token-1" {
			t.Fatalf("selector = %q, want token-1", selector)
		}
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		return newSession, nil
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateReady)

	locked := service.LockSession(nil)
	status := service.OpenSession(nil, OperationRequest{Selector: locked.SelectedSelector})

	if status.Error != nil {
		t.Fatalf("unexpected reopen error: %#v", status.Error)
	}
	if oldSession.closeCount != 1 {
		t.Fatalf("old close count = %d, want 1", oldSession.closeCount)
	}
	if openCalls != 1 {
		t.Fatalf("open calls = %d, want 1", openCalls)
	}
	if newSession.runCount != 0 {
		t.Fatalf("new run count = %d, want 0", newSession.runCount)
	}
	if status.State != sessionStateReady {
		t.Fatalf("state = %q, want ready", status.State)
	}
}

func TestOpenSessionReopensSessionAfterStaleState(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	newSession := &fakeSession{}
	openCalls := 0
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return []ctapkit.Device{{}}, nil
	}
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		openCalls++
		return newSession, nil
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateRunning)
	service.activeOperation = "op-stale"
	service.closeSessionAfterRuntimeError("op-stale", oldSession, &OperationError{
		Category: model.ErrorInvalidSession,
		Message:  "lease expired",
	})

	status := service.OpenSession(nil, OperationRequest{Selector: "token-1"})

	if status.Error != nil {
		t.Fatalf("unexpected reopen error: %#v", status.Error)
	}
	if oldSession.closeCount != 1 {
		t.Fatalf("old close count = %d, want 1", oldSession.closeCount)
	}
	if openCalls != 1 {
		t.Fatalf("open calls = %d, want 1", openCalls)
	}
	if newSession.runCount != 0 {
		t.Fatalf("new run count = %d, want 0", newSession.runCount)
	}
	if status.State != sessionStateReady {
		t.Fatalf("state = %q, want ready", status.State)
	}
}

func TestSelectDoesNotHoldMutexWhileClosingOldSession(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{
		closeHook: func() {
			service.mu.Lock()
			service.mu.Unlock()
		},
	}
	newSession := &fakeSession{}
	service.selectDevice = func(_ []ctapkit.Device, _ string) (ctapkit.Device, error) {
		return ctapkit.Device{}, nil
	}
	service.openSession = func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error) {
		return newSession, nil
	}
	seedOpenSession(service, "token-1", oldSession, sessionStateReady)

	assertCompletes(t, "Select", func() {
		response := service.Select(nil, "token-2")
		if response.Error != nil {
			t.Fatalf("unexpected select error: %#v", response.Error)
		}
	})
}

func TestDiscoverStalePathDoesNotHoldMutexWhileClosingSession(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{
		closeHook: func() {
			service.mu.Lock()
			service.mu.Unlock()
		},
	}
	service.discoverDevices = func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error) {
		return nil, nil
	}
	seedOpenSession(service, "token-1", session, sessionStateReady)

	assertCompletes(t, "Discover", func() {
		response := service.Discover(nil, DiscoverRequest{})
		if response.Error != nil {
			t.Fatalf("unexpected discover error: %#v", response.Error)
		}
	})
}

func TestInvalidateSessionAfterErrorDoesNotHoldMutexWhileClosingSession(t *testing.T) {
	service := NewAuthenticatorService()
	session := &fakeSession{
		closeHook: func() {
			service.mu.Lock()
			service.mu.Unlock()
		},
	}
	seedOpenSession(service, "token-1", session, sessionStateRunning)
	service.activeOperation = "op-1"

	assertCompletes(t, "closeSessionAfterRuntimeError", func() {
		service.closeSessionAfterRuntimeError("op-1", session, &OperationError{
			Category: model.ErrorInvalidSession,
			Message:  "lease expired",
		})
	})
}

func TestDiscoverSelectionDoesNotAutoSwitchWhenCurrentMissing(t *testing.T) {
	reports := []report.DeviceReport{{DeviceID: "new-device", OrdinalAlias: "1", Path: "new-path"}}
	if got := reconcileDiscoverySelectionLocked("old-device", reports); got != "" {
		t.Fatalf("selection = %q, want cleared selection", got)
	}
}

func TestSameSelectedDeviceRejectsAliasOnlyMatch(t *testing.T) {
	current := &report.DeviceReport{DeviceID: "old-device", OrdinalAlias: "1", Path: "old-path"}
	discovered := &report.DeviceReport{DeviceID: "new-device", OrdinalAlias: "1", Path: "new-path"}
	if sameSelectedDevice(current, discovered) {
		t.Fatal("expected alias-only match to be rejected")
	}
}

func TestOldSessionErrorDoesNotInvalidateNewSelection(t *testing.T) {
	service := NewAuthenticatorService()
	oldSession := &fakeSession{}
	newSession := &fakeSession{}
	seedOpenSession(service, "token-2", newSession, sessionStateReady)

	service.closeSessionAfterRuntimeError("op-old", oldSession, &OperationError{
		Category: model.ErrorInvalidSession,
		Message:  "old session failed after switch",
	})

	if service.sessionState != sessionStateReady {
		t.Fatalf("state = %q, want ready", service.sessionState)
	}
	if newSession.closeCount != 0 {
		t.Fatalf("new session close count = %d, want 0", newSession.closeCount)
	}
}
