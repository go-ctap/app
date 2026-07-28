package service

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/google/uuid"
)

type selection struct {
	id         SelectionID
	device     report.DeviceReport
	runtime    openedAuthenticator
	operations map[OperationID]*operationState
}

type authenticatorLifecycle interface {
	Close() error
	Closed() bool
}

type openedAuthenticator struct {
	client    *ctapkit.Authenticator
	lifecycle authenticatorLifecycle
	device    report.DeviceReport
}

func newOpenedAuthenticator(client *ctapkit.Authenticator) openedAuthenticator {
	return openedAuthenticator{
		client:    client,
		lifecycle: client,
		device:    client.Device(),
	}
}

func (a openedAuthenticator) Close() error {
	return a.lifecycle.Close()
}

func (a openedAuthenticator) Closed() bool {
	return a.lifecycle.Closed()
}

func newSelection(id SelectionID, runtime openedAuthenticator) *selection {
	return &selection{
		id:         id,
		device:     runtime.device,
		runtime:    runtime,
		operations: make(map[OperationID]*operationState),
	}
}

func (s *Service) SetSelection(ctx context.Context, req SelectionRequest) (SelectionSnapshot, error) {
	unlock, err := s.lockSelection(ctx)
	if err != nil {
		return SelectionSnapshot{}, err
	}
	defer unlock()

	if s.isClosed() {
		return SelectionSnapshot{}, closedServiceError(failure.PhaseAuthenticator)
	}

	if req.AttachmentID == "" {
		if selected := s.currentSelection(); selected != nil {
			closeErr := s.closeSelection(selected)
			s.retireSelection(selected)
			return SelectionSnapshot{}, closeErr
		}
		return SelectionSnapshot{}, nil
	}

	s.mu.Lock()
	inventory := s.inventory
	present := attachmentPresent(s.devices, req.AttachmentID)
	current := s.selected
	s.mu.Unlock()
	if inventory == nil || !present {
		return SelectionSnapshot{}, failure.New(
			failure.CodeDeviceNotFound,
			failure.WithPhase(failure.PhaseDiscovery),
		)
	}
	if current != nil && current.device.Attachment.ID == req.AttachmentID {
		active := ActiveSelection{ID: current.id}
		return SelectionSnapshot{Selection: &active}, nil
	}

	if current != nil {
		_ = s.closeSelection(current)
		s.retireSelection(current)
	}

	runtime, err := s.openAuthenticator(
		ctx,
		inventory,
		req.AttachmentID,
		ctapkit.WithLogJournal(s.logs),
	)
	if err != nil {
		return SelectionSnapshot{}, err
	}
	selected := newSelection(
		SelectionID(uuid.NewString()),
		runtime,
	)

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		_ = selected.runtime.Close()
		return SelectionSnapshot{}, closedServiceError(failure.PhaseAuthenticator)
	}
	s.selected = selected
	s.mu.Unlock()

	active := ActiveSelection{ID: selected.id}
	return SelectionSnapshot{Selection: &active}, nil
}

func (s *Service) Close() error {
	s.selectionGate <- struct{}{}

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		<-s.selectionGate
		return nil
	}
	s.closed = true
	selected := s.selected
	inventory := s.inventory
	inventoryDone := s.inventoryDone
	s.mu.Unlock()

	var closeErr error
	if selected != nil {
		closeErr = s.closeSelection(selected)
		s.retireSelection(selected)
	}
	<-s.selectionGate

	if inventory != nil {
		if err := inventory.Close(); closeErr == nil {
			closeErr = err
		}
	}
	if inventoryDone != nil {
		<-inventoryDone
	}

	return closeErr
}

func (s *Service) currentSelection() *selection {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.selected
}

func (s *Service) lockSelection(ctx context.Context) (func(), error) {
	select {
	case s.selectionGate <- struct{}{}:
		return func() { <-s.selectionGate }, nil
	case <-ctx.Done():
		return nil, normalizeServicePhaseError(ctx.Err(), failure.PhaseAuthenticator)
	}
}

func (s *Service) closeSelection(selected *selection) error {
	closeErr := selected.runtime.Close()
	s.cancelAndWait(selected)

	return closeErr
}

func (s *Service) cancelAndWait(selected *selection) {
	s.mu.Lock()
	operations := make([]*operationState, 0, len(selected.operations))
	for _, operation := range selected.operations {
		operations = append(operations, operation)
	}
	s.mu.Unlock()

	for _, operation := range operations {
		operation.cancel()
	}
	for _, operation := range operations {
		<-operation.done
	}
}
