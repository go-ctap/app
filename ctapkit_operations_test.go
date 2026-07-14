package main

import (
	"context"
	"testing"

	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/failure"
	kitservice "github.com/go-ctap/kit/service"
)

func TestListCredentialsPreservesToolkitErrorEnvelopeAcrossWailsBoundary(t *testing.T) {
	service := NewCtapkitService()
	defer func() {
		if err := service.ServiceShutdown(); err != nil {
			t.Fatalf("ServiceShutdown: %v", err)
		}
	}()

	envelope, err := service.ListCredentials(context.Background(), kitservice.CredentialListRequest{
		OperationRequest: kitservice.OperationRequest{SessionID: "missing-session"},
		Refresh:          true,
	})
	if err != nil {
		t.Fatalf("ListCredentials: %v", err)
	}

	if envelope.SessionID != "missing-session" {
		t.Fatalf("session ID = %q, want missing-session", envelope.SessionID)
	}
	if envelope.Kind != model.OperationListCredentials {
		t.Fatalf("kind = %q, want %q", envelope.Kind, model.OperationListCredentials)
	}
	if envelope.Error == nil || envelope.Error.Code != failure.CodeSessionInvalid ||
		envelope.Error.Category != failure.CategoryInvalidSession {
		t.Fatalf("error = %#v, want SESSION_INVALID/invalid-session", envelope.Error)
	}
}

func TestListLargeBlobsPreservesToolkitErrorEnvelopeAcrossWailsBoundary(t *testing.T) {
	service := NewCtapkitService()
	defer func() {
		if err := service.ServiceShutdown(); err != nil {
			t.Fatalf("ServiceShutdown: %v", err)
		}
	}()

	envelope, err := service.ListLargeBlobs(context.Background(), kitservice.LargeBlobListRequest{
		OperationRequest: kitservice.OperationRequest{SessionID: "missing-session"},
		Refresh:          true,
	})
	if err != nil {
		t.Fatalf("ListLargeBlobs: %v", err)
	}

	if envelope.SessionID != "missing-session" {
		t.Fatalf("session ID = %q, want missing-session", envelope.SessionID)
	}
	if envelope.Kind != model.OperationListLargeBlobs {
		t.Fatalf("kind = %q, want %q", envelope.Kind, model.OperationListLargeBlobs)
	}
	if envelope.Error == nil || envelope.Error.Code != failure.CodeSessionInvalid ||
		envelope.Error.Category != failure.CategoryInvalidSession {
		t.Fatalf("error = %#v, want SESSION_INVALID/invalid-session", envelope.Error)
	}
}
