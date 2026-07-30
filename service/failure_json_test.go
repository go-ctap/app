package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/go-ctap/kit/model/config"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/operation"
)

func TestGetAssertionFailureEnvelopeExactJSON(t *testing.T) {
	err := failure.Wrap(
		failure.CodeAssertionNotAllowed,
		errors.New("authenticator rejected the CTAP operation in its current state"),
		failure.WithOperation(string(operation.GetAssertion)),
		failure.WithPhase(failure.PhaseAuthenticatorCommand),
		failure.WithCTAP(&failure.CTAPDetail{
			Command:     "authenticatorGetAssertion",
			CommandCode: 2,
			Status:      "CTAP2_ERR_NOT_ALLOWED",
			StatusCode:  48,
		}),
	)
	envelope := GetAssertionEnvelope{
		OperationEnvelopeMeta: OperationEnvelopeMeta{
			OperationID: "operation-1",
			SelectionID: "selection-1",
			Kind:        operation.GetAssertion,
			Error:       failure.Snapshot(err),
		},
	}

	raw, marshalErr := json.Marshal(envelope)

	if marshalErr != nil {
		t.Fatalf("Marshal: %v", marshalErr)
	}

	want := `{"operationId":"operation-1","selectionId":"selection-1","kind":"webauthn.getAssertion","authenticatorClosed":false,"error":{"code":"ASSERTION_NOT_ALLOWED","category":"invalid-state","operation":"webauthn.getAssertion","phase":"authenticator-command","ctap":{"command":"authenticatorGetAssertion","commandCode":2,"status":"CTAP2_ERR_NOT_ALLOWED","statusCode":48}}}`

	if string(raw) != want {
		t.Fatalf("JSON = %s, want %s", raw, want)
	}
}

func TestDirectServiceErrorIsTypedAndMachineReadable(t *testing.T) {
	service := New()

	_, err := service.SetSelection(context.Background(), SelectionRequest{AttachmentID: "missing-device"})

	if err == nil {
		t.Fatal("SetSelection error = nil, want failure")
	}

	var typed *failure.Error

	if !errors.As(err, &typed) {
		t.Fatalf("SetSelection error type = %T, want *failure.Error", err)
	}

	if !failure.IsCode(err, failure.CodeDeviceNotFound) {
		t.Fatalf("SetSelection error = %v, want %s", err, failure.CodeDeviceNotFound)
	}
}

func TestBioEnrollEnvelopeKeepsFailureWithoutResult(t *testing.T) {
	output := config.BioEnrollOutput{Result: &config.BioEnrollResult{
		TemplateIDHex: "aabb",
	}}
	runErr := failure.Wrap(
		failure.CodeBioInteractionTimeout,
		errors.New("capture timeout after touching sensor"),
		failure.WithOperation(string(operation.BioEnroll)),
		failure.WithPhase(failure.PhaseInteraction),
	)
	runtime := &recordingAuthenticator{}
	service := New()

	service.selected = newSelection(
		"selection-1",
		openedAuthenticator{lifecycle: runtime},
	)

	meta, result := runOperation(
		service,
		t.Context(),
		OperationRequest{SelectionID: "selection-1"},
		operation.BioEnroll,
		staticOperationExecutor(output, runErr),
	)

	envelope := BioEnrollEnvelope{OperationEnvelopeMeta: meta, Result: result}

	if envelope.Error == nil || envelope.Error.Code != failure.CodeBioInteractionTimeout {
		t.Fatalf("error = %#v, want %s", envelope.Error, failure.CodeBioInteractionTimeout)
	}

	if envelope.Result != nil {
		t.Fatalf("result = %#v, want nil on failure", envelope.Result)
	}
}
