package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"strings"
	"sync"
	"testing"

	ctaptransport "github.com/go-ctap/ctap/transport"
	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/config"
	"github.com/go-ctap/kit/model/credentials"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
)

func TestInvalidSelectionOperationAppendsCompletedEntry(t *testing.T) {
	service := New()

	envelope, err := service.ListCredentials(context.Background(), CredentialListRequest{
		OperationRequest: OperationRequest{SelectionID: "missing-selection"},
	})
	if err != nil {
		t.Fatalf("ListCredentials: %v", err)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 1 {
		t.Fatalf("log count = %d, want 1", len(logs))
	}

	entry := logs[0].Entry
	if entry.Outcome != model.LogOutcomeFailed || entry.Error == nil || entry.Error.Code != failure.CodeSelectionInvalid {
		t.Fatalf("completed entry = %#v", logs[0])
	}

	if entry.OperationID != string(envelope.OperationID) || entry.SelectionID != "missing-selection" {
		t.Fatalf("log correlation = %#v, envelope operation ID = %q", entry, envelope.OperationID)
	}

	if entry.Request != nil || entry.Response != nil {
		t.Fatalf("service payloads = request %#v, response %#v", entry.Request, entry.Response)
	}
}

func TestOperationLoggingMarksDryRuns(t *testing.T) {
	service := New()

	_, err := service.DeleteCredential(context.Background(), CredentialDeleteRequest{
		OperationRequest: OperationRequest{SelectionID: "missing-selection"},
		CredentialIDHex:  "01",
		DryRun:           true,
	})
	if err != nil {
		t.Fatalf("DeleteCredential: %v", err)
	}
	_, err = service.DeleteCredential(context.Background(), CredentialDeleteRequest{
		OperationRequest: OperationRequest{SelectionID: "missing-selection"},
		CredentialIDHex:  "01",
	})
	if err != nil {
		t.Fatalf("DeleteCredential execute: %v", err)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 2 || !logs[0].Entry.DryRun {
		t.Fatalf("dry-run operation log = %#v", logs)
	}
	if logs[1].Entry.DryRun {
		t.Fatalf("execute operation marked as dry-run = %#v", logs[1])
	}
}

func TestOperationLoggingOmitsPayloadsAndSecrets(t *testing.T) {
	const (
		currentPIN = "sentinel-current-pin-1182"
		newPIN     = "sentinel-new-pin-9921"
	)
	output := config.PINOutput{}
	runtime := &recordingAuthenticator{}
	service := New()
	service.selected = newSelection(
		"selection-1",
		report.DeviceReport{},
		openedAuthenticator{lifecycle: runtime},
	)
	operation := config.ChangePINOperation{CurrentPIN: currentPIN, NewPIN: newPIN}
	execute := func(
		context.Context,
		*ctapkit.Authenticator,
		...ctapkit.OperationOption,
	) (*config.PINOutput, error) {
		if operation.CurrentPIN != currentPIN || operation.NewPIN != newPIN {
			t.Fatalf("captured operation = %#v", operation)
		}

		return &output, nil
	}

	_, _, err := runOperation(
		service,
		context.Background(),
		OperationRequest{SelectionID: "selection-1"},
		model.OperationChangePIN,
		false,
		execute,
	)
	if err != nil {
		t.Fatalf("ChangePIN: %v", err)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 1 {
		t.Fatalf("operation logs = %#v", logs)
	}
	entry := logs[0].Entry
	if entry.Request != nil || entry.Response != nil || len(entry.RedactedFields) != 0 {
		t.Fatalf("service payload metadata = %#v", entry)
	}

	raw, err := json.Marshal(logs)
	if err != nil {
		t.Fatalf("Marshal logs: %v", err)
	}
	serialized := string(raw)
	for _, secret := range []string{currentPIN, newPIN} {
		if strings.Contains(serialized, secret) || strings.Contains(serialized, base64.StdEncoding.EncodeToString([]byte(secret))) {
			t.Fatalf("logs contain %q: %s", secret, serialized)
		}
	}
}

func TestOperationLoggingDoesNotRequireEventEmitter(t *testing.T) {
	output := credentials.InventoryReport{}
	runtime := &recordingAuthenticator{}
	service := New()
	service.selected = newSelection(
		"selection-1",
		report.DeviceReport{},
		openedAuthenticator{lifecycle: runtime},
	)

	meta, result, err := runOperation(
		service,
		context.Background(),
		OperationRequest{SelectionID: "selection-1"},
		model.OperationListCredentials,
		false,
		staticOperationExecutor(&output, nil),
	)
	if err != nil {
		t.Fatalf("ListCredentials: %v", err)
	}
	envelope := CredentialsEnvelope{OperationEnvelopeMeta: meta, Result: result}

	if envelope.Error != nil || envelope.Result == nil {
		t.Fatalf("envelope = %#v", envelope)
	}

	if logs := serviceLogs(t, service); len(logs) == 0 {
		t.Fatal("operation journal is empty")
	}
}

func TestOperationLoggingRetainsTransportDiagnostic(t *testing.T) {
	runtime := &recordingAuthenticator{}
	runErr := failure.Wrap(
		failure.CodeTransportFailure,
		&ctaptransport.IOError{
			Operation: ctaptransport.IORead,
			Err:       io.ErrClosedPipe,
		},
		failure.WithOperation(string(model.OperationListCredentials)),
		failure.WithPhase(failure.PhaseDiscovery),
	)
	service := New()
	service.selected = newSelection(
		"selection-1",
		report.DeviceReport{},
		openedAuthenticator{lifecycle: runtime},
	)

	meta, result, err := runOperation(
		service,
		context.Background(),
		OperationRequest{SelectionID: "selection-1"},
		model.OperationListCredentials,
		false,
		staticOperationExecutor[credentials.InventoryReport](nil, runErr),
	)
	if err != nil {
		t.Fatalf("ListCredentials: %v", err)
	}
	envelope := CredentialsEnvelope{OperationEnvelopeMeta: meta, Result: result}

	if envelope.Error == nil || envelope.Error.Code != failure.CodeTransportFailure {
		t.Fatalf("envelope error = %#v", envelope.Error)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 1 {
		t.Fatalf("operation logs = %#v", logs)
	}

	if logs[0].Entry.ErrorMessage != "transport read: io: read/write on closed pipe" {
		t.Fatalf("error message = %q", logs[0].Entry.ErrorMessage)
	}
}

func TestSelectionLifecycleLoggingAppendsCompletedEntries(t *testing.T) {
	service := New()
	service.resolveDevice = func([]ctapkit.Device, string) (selectedDevice, error) {
		return selectedDevice{report: testDevice("hid://one", "fingerprint-1")}, nil
	}
	service.openAuthenticator = func(
		context.Context,
		ctapkit.Device,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		return openedAuthenticator{}, io.ErrClosedPipe
	}

	if _, err := service.SetSelection(context.Background(), SelectionRequest{Selector: "fingerprint-1"}); err == nil {
		t.Fatal("SetSelection error = nil, want open failure")
	}
	service.selected = newSelection(
		"selection-1",
		report.DeviceReport{},
		openedAuthenticator{lifecycle: &recordingAuthenticator{}},
	)
	if _, err := service.SetSelection(context.Background(), SelectionRequest{}); err != nil {
		t.Fatalf("clear selection: %v", err)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 2 {
		t.Fatalf("selection lifecycle log count = %d, want 2: %#v", len(logs), logs)
	}

	if logs[0].Entry.Code != model.LogCodeSelectionOpen || logs[0].Entry.Outcome != model.LogOutcomeFailed {
		t.Fatalf("open selection entry = %#v", logs[0])
	}

	if logs[1].Entry.Code != model.LogCodeSelectionClose || logs[1].Entry.Outcome != model.LogOutcomeSucceeded {
		t.Fatalf("close selection entry = %#v", logs[1])
	}
}

func TestProgressLoggingDoesNotDuplicateOperationEvent(t *testing.T) {
	emitter := newCountingLogEmitter()
	service := New(WithEventEmitter(emitter))
	service.selected = newSelection("selection-1", report.DeviceReport{}, openedAuthenticator{})
	operation := &operationState{
		id:          "operation-1",
		selectionID: "selection-1",
		kind:        model.OperationListCredentials,
	}
	service.selected.operations[operation.id] = operation

	operationEventSink{service: service, operation: operation}.Emit(context.Background(), model.OperationEvent{
		Stage: model.OperationStageEnumeratingCredentials,
	})
	if got := emitter.count(EventOperationEvent); got != 1 {
		t.Fatalf("operation event count = %d, want 1", got)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 1 || logs[0].Entry.Code != model.LogCodeOperationProgress {
		t.Fatalf("progress logs = %#v", logs)
	}

	if logs[0].Entry.SelectionID != "selection-1" || logs[0].Entry.OperationID != "operation-1" {
		t.Fatalf("progress correlation = %#v", logs[0])
	}
}

func TestInteractionLoggingAppendsMetadataOnlyEntriesWithoutDuplicatePrompt(t *testing.T) {
	const sentinelPIN = "sentinel-interaction-pin-8301"
	emitter := newCountingLogEmitter()
	service := New(WithEventEmitter(emitter))
	done := make(chan struct{})
	service.selected = newSelection("selection-1", report.DeviceReport{}, openedAuthenticator{})
	service.selected.operations["operation-1"] = &operationState{
		id:          "operation-1",
		selectionID: "selection-1",
		kind:        model.OperationListCredentials,
		done:        done,
	}
	handler := interactionHandler{
		service:     service,
		done:        done,
		selectionID: "selection-1",
		operationID: "operation-1",
		kind:        model.OperationListCredentials,
	}

	result := make(chan error, 1)
	go func() {
		_, err := handler.RequestInteraction(t.Context(), model.InteractionRequest{Kind: model.InteractionKindPIN})
		result <- err
	}()
	prompt := <-emitter.prompts
	resolved, err := service.ResolveInteraction(context.Background(), InteractionAnswer{
		InteractionID: prompt.InteractionID,
		PIN:           sentinelPIN,
	})
	if err != nil || !resolved {
		t.Fatalf("ResolveInteraction = %v, %v", resolved, err)
	}

	if err := <-result; err != nil {
		t.Fatalf("RequestInteraction: %v", err)
	}

	if got := emitter.count(EventInteractionRequested); got != 1 {
		t.Fatalf("interaction event count = %d, want 1", got)
	}

	logs := serviceLogs(t, service)
	if len(logs) != 2 {
		t.Fatalf("interaction log count = %d, want 2: %#v", len(logs), logs)
	}

	for _, record := range logs {
		if record.Entry.SelectionID != "selection-1" || record.Entry.OperationID != "operation-1" {
			t.Fatalf("interaction correlation = %#v", record.Entry)
		}
		if record.Entry.Request != nil || record.Entry.Response != nil || len(record.Entry.RedactedFields) != 0 {
			t.Fatalf("interaction payload metadata = %#v", record.Entry)
		}
	}

	requestEntry := logs[0].Entry
	if requestEntry.Code != model.LogCodeInteractionRequest ||
		requestEntry.Level != model.LogLevelInfo ||
		requestEntry.Outcome != model.LogOutcomeSucceeded ||
		requestEntry.Params["interactionKind"] != string(model.InteractionKindPIN) ||
		requestEntry.Params["interactionId"] != string(prompt.InteractionID) {
		t.Fatalf("interaction request log = %#v", requestEntry)
	}

	raw, err := json.Marshal(logs)
	if err != nil {
		t.Fatalf("Marshal logs: %v", err)
	}
	if strings.Contains(string(raw), sentinelPIN) || strings.Contains(string(raw), base64.StdEncoding.EncodeToString([]byte(sentinelPIN))) {
		t.Fatalf("interaction logs contain PIN: %s", raw)
	}
}

type countingLogEmitter struct {
	mu      sync.Mutex
	names   []string
	prompts chan InteractionPrompt
}

func newCountingLogEmitter() *countingLogEmitter {
	return &countingLogEmitter{prompts: make(chan InteractionPrompt, 1)}
}

func (e *countingLogEmitter) Emit(name string, payload any) {
	e.mu.Lock()
	e.names = append(e.names, name)
	e.mu.Unlock()
	if prompt, ok := payload.(InteractionPrompt); ok {
		e.prompts <- prompt
	}
}

func (e *countingLogEmitter) count(name string) int {
	e.mu.Lock()
	defer e.mu.Unlock()
	count := 0
	for _, candidate := range e.names {
		if candidate == name {
			count++
		}
	}

	return count
}

func serviceLogs(t *testing.T, service *Service) []model.LogJournalRecord {
	t.Helper()

	return service.ReadLogs(ReadLogsRequest{}).Entries
}
