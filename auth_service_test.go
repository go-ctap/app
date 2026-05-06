package main

import (
	"errors"
	"testing"
	"time"

	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/report"
)

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
