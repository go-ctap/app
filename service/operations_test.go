package service

import (
	"context"
	"encoding/json"
	"testing"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/credentials"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/operation"
	"github.com/go-ctap/kit/model/report"
)

func TestListCredentialsInvalidSelectionReturnsTypedErrorEnvelope(t *testing.T) {
	service := New()

	envelope, err := service.ListCredentials(context.Background(), CredentialListRequest{
		OperationRequest: OperationRequest{SelectionID: "missing-selection"},
	})
	if err != nil {
		t.Fatalf("ListCredentials error = %v, want nil because the failure is in the envelope", err)
	}

	if envelope.SelectionID != "missing-selection" {
		t.Fatalf("envelope selection ID = %q, want missing-selection", envelope.SelectionID)
	}

	if envelope.Kind != operation.ListCredentials {
		t.Fatalf("envelope kind = %q, want %q", envelope.Kind, operation.ListCredentials)
	}

	if envelope.Error == nil || envelope.Error.Code != failure.CodeAuthenticatorClosed {
		t.Fatalf("envelope error = %#v, want %s", envelope.Error, failure.CodeAuthenticatorClosed)
	}

	if envelope.Error.Category != failure.CategoryInvalidState || envelope.Error.Phase != failure.PhaseAuthenticator {
		t.Fatalf("envelope error = %#v, want invalid-state/authenticator", envelope.Error)
	}
}

func TestListCredentialsFailureUsesOnlyTheTypedEnvelopeError(t *testing.T) {
	runtime := &recordingAuthenticator{}
	runErr := failure.Wrap(
		failure.CodeOperationCanceled,
		context.Canceled,
		failure.WithPhase(failure.PhaseAuthenticatorCommand),
	)
	service := New()
	service.selected = newSelection("selection-1", report.DeviceReport{}, openedAuthenticator{lifecycle: runtime})

	meta, result, err := runOperation(
		service,
		context.Background(),
		OperationRequest{SelectionID: "selection-1"},
		operation.ListCredentials,
		staticOperationExecutor[credentials.InventoryReport](nil, runErr),
	)
	if err != nil {
		t.Fatalf("ListCredentials error = %v, want nil because the failure is in the envelope", err)
	}
	envelope := CredentialsEnvelope{OperationEnvelopeMeta: meta, Result: result}

	if envelope.Error == nil || envelope.Error.Code != failure.CodeOperationCanceled {
		t.Fatalf("envelope error = %#v, want %s", envelope.Error, failure.CodeOperationCanceled)
	}

	if envelope.Error.Category != failure.CategoryCanceled {
		t.Fatalf("envelope error category = %q, want %q", envelope.Error.Category, failure.CategoryCanceled)
	}

	if envelope.Result != nil {
		t.Fatalf("envelope result = %#v, want nil on operation failure", envelope.Result)
	}

	if envelope.AuthenticatorClosed {
		t.Fatal("envelope authenticatorClosed = true, want false")
	}

	if _, ok := service.selectionFor("selection-1"); !ok {
		t.Fatal("selected selection was retired")
	}
}

func TestOperationEnvelopeReportsAndRetiresClosedSelection(t *testing.T) {
	runtime := &recordingAuthenticator{
		closed: true,
	}
	runErr := failure.Wrap(
		failure.CodeOperationCanceled,
		context.Canceled,
		failure.WithPhase(failure.PhaseAuthenticatorCommand),
	)
	service := New()
	service.selected = newSelection("selection-1", report.DeviceReport{}, openedAuthenticator{lifecycle: runtime})

	meta, result, err := runOperation(
		service,
		context.Background(),
		OperationRequest{SelectionID: "selection-1"},
		operation.ListCredentials,
		staticOperationExecutor[credentials.InventoryReport](nil, runErr),
	)
	if err != nil {
		t.Fatalf("ListCredentials: %v", err)
	}
	envelope := CredentialsEnvelope{OperationEnvelopeMeta: meta, Result: result}

	if !envelope.AuthenticatorClosed {
		t.Fatal("envelope authenticatorClosed = false, want true")
	}

	if envelope.Error == nil || envelope.Error.Code != failure.CodeOperationCanceled {
		t.Fatalf("envelope error = %#v, want %s", envelope.Error, failure.CodeOperationCanceled)
	}

	if _, ok := service.selectionFor("selection-1"); ok {
		t.Fatal("closed selected selection was retained")
	}
}

func TestPINRequestsRoundTripSecrets(t *testing.T) {
	var setPIN PINSetRequest
	if err := json.Unmarshal([]byte(`{"selectionId":"selection-1","newPIN":"123456"}`), &setPIN); err != nil {
		t.Fatalf("unmarshal set PIN request: %v", err)
	}

	if setPIN.SelectionID != "selection-1" || setPIN.NewPIN != "123456" {
		t.Fatalf("unexpected set PIN request: %#v", setPIN)
	}

	raw, err := json.Marshal(setPIN)
	if err != nil {
		t.Fatalf("marshal set PIN request: %v", err)
	}

	var setPINRoundTrip PINSetRequest
	if err := json.Unmarshal(raw, &setPINRoundTrip); err != nil {
		t.Fatalf("unmarshal marshaled set PIN request: %v", err)
	}

	if setPINRoundTrip != setPIN {
		t.Fatalf("set PIN request round trip = %#v, want %#v", setPINRoundTrip, setPIN)
	}

	var changePIN PINChangeRequest
	if err := json.Unmarshal([]byte(`{"selectionId":"selection-1","currentPIN":"123456","newPIN":"654321","dryRun":true}`), &changePIN); err != nil {
		t.Fatalf("unmarshal change PIN request: %v", err)
	}

	if changePIN.SelectionID != "selection-1" || changePIN.CurrentPIN != "123456" || changePIN.NewPIN != "654321" || !changePIN.DryRun {
		t.Fatalf("unexpected change PIN request: %#v", changePIN)
	}

	raw, err = json.Marshal(changePIN)
	if err != nil {
		t.Fatalf("marshal change PIN request: %v", err)
	}

	var changePINRoundTrip PINChangeRequest
	if err := json.Unmarshal(raw, &changePINRoundTrip); err != nil {
		t.Fatalf("unmarshal marshaled change PIN request: %v", err)
	}

	if changePINRoundTrip != changePIN {
		t.Fatalf("change PIN request round trip = %#v, want %#v", changePINRoundTrip, changePIN)
	}
}

type recordingAuthenticator struct {
	closed bool
}

func (s *recordingAuthenticator) Close() error { return nil }

func (s *recordingAuthenticator) Closed() bool { return s.closed }

func staticOperationExecutor[T any](result *T, err error) operationExecutor[T] {
	return func(
		context.Context,
		*ctapkit.Authenticator,
		...ctapkit.OperationOption,
	) (*T, error) {
		return result, err
	}
}
