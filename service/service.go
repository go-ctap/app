package service

import (
	"context"
	"sync"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
	"github.com/google/uuid"
)

type EventEmitter interface {
	Emit(name string, payload any)
}

type Option func(*Service)

type inventoryRuntime interface {
	Snapshot() ctapkit.InventorySnapshot
	Events() <-chan ctapkit.InventoryEvent
	OpenAuthenticator(
		context.Context,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (*ctapkit.Authenticator, error)
	Close() error
}

type openAuthenticatorFunc func(
	context.Context,
	inventoryRuntime,
	report.AttachmentID,
	...ctapkit.AuthenticatorOption,
) (openedAuthenticator, error)

type Service struct {
	mu                sync.Mutex
	emitter           EventEmitter
	closed            bool
	openInventory     func(context.Context, transport.Mode) (inventoryRuntime, error)
	openAuthenticator openAuthenticatorFunc
	inventory         inventoryRuntime
	inventoryDone     chan struct{}
	selectionGate     chan struct{}

	selected     *selection
	interactions map[InteractionID]*pendingInteraction
	logs         *ctapkit.LogJournal
}

type operationState struct {
	id          OperationID
	selectionID SelectionID
	cancel      context.CancelFunc
	done        chan struct{}
}

type pendingInteraction struct {
	response chan model.InteractionResponse
	done     <-chan struct{}
}

func New(opts ...Option) *Service {
	service := &Service{
		interactions: make(map[InteractionID]*pendingInteraction),
		openInventory: func(
			ctx context.Context,
			mode transport.Mode,
		) (inventoryRuntime, error) {
			return ctapkit.OpenInventory(ctx, mode)
		},
		openAuthenticator: func(
			ctx context.Context,
			inventory inventoryRuntime,
			attachmentID report.AttachmentID,
			opts ...ctapkit.AuthenticatorOption,
		) (openedAuthenticator, error) {
			client, err := inventory.OpenAuthenticator(ctx, attachmentID, opts...)

			if err != nil {
				return openedAuthenticator{}, err
			}

			return newOpenedAuthenticator(client), nil
		},
		selectionGate: make(chan struct{}, 1),
		logs:          ctapkit.NewLogJournal(),
	}

	for _, opt := range opts {
		if opt != nil {
			opt(service)
		}
	}

	return service
}

func WithEventEmitter(emitter EventEmitter) Option {
	return func(service *Service) {
		service.emitter = emitter
	}
}

func (s *Service) CancelOperation(req CancelOperationRequest) bool {
	return s.cancelOperation(req.OperationID)
}

func (s *Service) cancelOperation(id OperationID) bool {
	s.mu.Lock()

	selected := s.selected
	var operation *operationState

	if selected != nil {
		operation = selected.operations[id]
	}

	s.mu.Unlock()

	if operation == nil {
		return false
	}

	operation.cancel()

	return true
}

func (s *Service) ResolveInteraction(ctx context.Context, answer InteractionAnswer) (bool, error) {
	s.mu.Lock()

	pending, ok := s.interactions[answer.InteractionID]

	if ok {
		delete(s.interactions, answer.InteractionID)
	}

	s.mu.Unlock()

	if !ok {
		return false, nil
	}

	response := model.InteractionResponse{
		PIN:      []byte(answer.PIN),
		Canceled: answer.Canceled,
	}

	select {
	case pending.response <- response:
		return true, nil
	case <-pending.done:
		clear(response.PIN)

		return false, nil
	case <-ctx.Done():
		clear(response.PIN)

		return false, ctapkit.NormalizeError(ctx.Err(), failure.PhaseInteraction)
	}
}

func (s *Service) retireSelection(selected *selection) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.selected == selected {
		s.selected = nil
	}
}

func (s *Service) registerOperation(selected *selection, operation *operationState) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed || s.selected != selected || selected.id != operation.selectionID {
		return false
	}

	selected.operations[operation.id] = operation

	return true
}

func (s *Service) unregisterOperation(selected *selection, id OperationID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if operation, ok := selected.operations[id]; ok {
		close(operation.done)
	}

	delete(selected.operations, id)
}

func (s *Service) registerInteraction(
	id InteractionID,
	response chan model.InteractionResponse,
	done <-chan struct{},
) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.interactions[id] = &pendingInteraction{
		response: response,
		done:     done,
	}
}

func (s *Service) unregisterInteraction(id InteractionID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.interactions, id)
}

func (s *Service) emit(name string, payload any) {
	s.mu.Lock()

	emitter := s.emitter
	closed := s.closed

	s.mu.Unlock()

	if emitter == nil || closed {
		return
	}

	emitter.Emit(name, payload)
}

type operationEventSink struct {
	service   *Service
	operation *operationState
}

func (s operationEventSink) Emit(_ context.Context, event model.OperationEvent) {
	s.service.emitOperationEvent(s.operation, event)
}

func (s *Service) emitOperationEvent(operation *operationState, event model.OperationEvent) {
	s.mu.Lock()

	selected := s.selected
	ok := operation != nil && selected != nil && selected.id == operation.selectionID &&
		selected.operations[operation.id] == operation

	s.mu.Unlock()
	if !ok {
		return
	}

	s.emit(EventOperationEvent, OperationEventEnvelope{
		OperationID: operation.id,
		SelectionID: operation.selectionID,
		Event:       event,
	})
}

type interactionHandler struct {
	service     *Service
	done        <-chan struct{}
	selectionID SelectionID
	operationID OperationID
}

func (h interactionHandler) RequestInteraction(ctx context.Context, req model.InteractionRequest) (model.InteractionResponse, error) {
	prompt := InteractionPrompt{
		InteractionID: InteractionID(uuid.NewString()),
		OperationID:   h.operationID,
		SelectionID:   h.selectionID,
		Request:       req,
	}
	response := make(chan model.InteractionResponse)

	h.service.registerInteraction(prompt.InteractionID, response, h.done)
	h.service.emit(EventInteractionRequested, prompt)
	defer h.service.unregisterInteraction(prompt.InteractionID)

	select {
	case answer := <-response:
		return answer, nil
	case <-ctx.Done():
	case <-h.done:
	}

	return model.InteractionResponse{}, failure.New(failure.CodeInteractionCanceled,
		failure.WithPhase(failure.PhaseInteraction),
	)
}
