package service

import (
	"context"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/failure"
	"github.com/google/uuid"
)

type operationExecutor[T any] func(
	context.Context,
	*ctapkit.Authenticator,
	model.InteractionHandler,
	...ctapkit.OperationOption,
) (*T, error)

type authenticatorOperation[O any, T any] func(
	*ctapkit.Authenticator,
	context.Context,
	O,
	model.InteractionHandler,
	...ctapkit.OperationOption,
) (*T, error)

type inputlessAuthenticatorOperation[T any] func(
	*ctapkit.Authenticator,
	context.Context,
	model.InteractionHandler,
	...ctapkit.OperationOption,
) (*T, error)

func bindOperation[O any, T any](
	operation O,
	execute authenticatorOperation[O, T],
) operationExecutor[T] {
	return func(
		ctx context.Context,
		authenticator *ctapkit.Authenticator,
		handler model.InteractionHandler,
		opts ...ctapkit.OperationOption,
	) (*T, error) {
		return execute(authenticator, ctx, operation, handler, opts...)
	}
}

func bindInputlessOperation[T any](execute inputlessAuthenticatorOperation[T]) operationExecutor[T] {
	return func(
		ctx context.Context,
		authenticator *ctapkit.Authenticator,
		handler model.InteractionHandler,
		opts ...ctapkit.OperationOption,
	) (*T, error) {
		return execute(authenticator, ctx, handler, opts...)
	}
}

func runOperation[T any](
	service *Service,
	ctx context.Context,
	req OperationRequest,
	kind model.OperationKind,
	dryRun bool,
	execute operationExecutor[T],
) (meta OperationEnvelopeMeta, result *T, returnErr error) {
	operationID := OperationID(uuid.NewString())
	started := time.Now()
	var operationErr error
	defer func() {
		service.logs.Append(ctapkit.FinishLogEntry(model.LogEntry{
			Timestamp:     started.UTC(),
			Layer:         model.LogLayerOperation,
			Code:          model.LogCodeOperationRun,
			DryRun:        dryRun,
			OperationKind: kind,
			SelectionID:   string(req.SelectionID),
			OperationID:   string(operationID),
		}, started, operationErr))
	}()

	meta = OperationEnvelopeMeta{
		OperationID: operationID,
		SelectionID: req.SelectionID,
		Kind:        kind,
	}

	selected, ok := service.selectionFor(req.SelectionID)
	if !ok {
		operationErr = invalidSelectionError()
		meta.Error = failure.Snapshot(operationErr)

		return meta, nil, nil
	}

	ctx, cancel := context.WithCancel(ctx)
	state := &operationState{
		id:          operationID,
		selectionID: req.SelectionID,
		kind:        kind,
		cancel:      cancel,
		done:        make(chan struct{}),
	}

	if !service.registerOperation(selected, state) {
		cancel()

		operationErr = invalidSelectionError()
		meta.Error = failure.Snapshot(operationErr)

		return meta, nil, nil
	}
	defer cancel()
	defer service.unregisterOperation(selected, operationID)

	opts := runOptions(req.VerificationFlow)
	opts = append(opts, ctapkit.WithEventSink(operationEventSink{service: service, operation: state}))
	ctx = ctapkit.WithLogCorrelation(ctx, string(req.SelectionID), string(operationID), kind)
	result, operationErr = execute(ctx, selected.runtime.client, interactionHandler{
		service:     service,
		done:        state.done,
		selectionID: req.SelectionID,
		operationID: operationID,
		kind:        kind,
	}, opts...)

	meta.AuthenticatorClosed = selected.runtime.Closed()
	meta.Error = failure.Snapshot(operationErr)
	if meta.AuthenticatorClosed {
		service.retireSelection(selected)
	}

	return meta, result, nil
}
