package service

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func (s *Service) Discover(ctx context.Context) (AuthenticatorSessionSnapshot, error) {
	if err := s.ensureInventory(ctx); err != nil {
		return AuthenticatorSessionSnapshot{}, err
	}

	unlock, err := s.lockSelection(ctx)

	if err != nil {
		return AuthenticatorSessionSnapshot{}, err
	}

	defer unlock()

	s.mu.Lock()
	inventory := s.inventory
	s.mu.Unlock()

	inventorySnapshot := inventory.Snapshot()
	var selectionErr error

	if s.currentSelection() == nil && len(inventorySnapshot.Devices) > 0 {
		_, selectionErr = s.setSelection(ctx, SelectionRequest{
			AttachmentID: inventorySnapshot.Devices[0].Attachment.ID,
		})
	}

	return s.sessionSnapshot(inventorySnapshot.Devices, selectionErr), nil
}

func (s *Service) ensureInventory(ctx context.Context) error {
	unlock, err := s.lockSelection(ctx)

	if err != nil {
		return err
	}

	defer unlock()

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()

		return closedServiceError(failure.PhaseDiscovery)
	}

	if s.inventory != nil {
		s.mu.Unlock()

		return nil
	}

	open := s.openInventory

	s.mu.Unlock()

	inventory, err := open(ctx, transport.ModeAuto)

	if err != nil {
		return ctapkit.NormalizeError(err, failure.PhaseDiscovery)
	}

	done := make(chan struct{})

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		_ = inventory.Close()

		return closedServiceError(failure.PhaseDiscovery)
	}

	s.inventory = inventory
	s.inventoryDone = done
	s.mu.Unlock()

	go s.forwardInventoryEvents(inventory, done)

	return nil
}

func (s *Service) forwardInventoryEvents(inventory inventoryRuntime, done chan struct{}) {
	defer close(done)

	for event := range inventory.Events() {
		s.applyInventoryEvent(event)
	}
}

func (s *Service) applyInventoryEvent(event ctapkit.InventoryEvent) {
	s.selectionGate <- struct{}{}
	defer func() { <-s.selectionGate }()

	s.mu.Lock()
	if s.closed || s.inventory == nil {
		s.mu.Unlock()

		return
	}

	selected := s.selected
	missing := selected != nil &&
		!attachmentPresent(event.Snapshot.Devices, selected.device.Attachment.ID)

	s.mu.Unlock()

	if missing {
		_ = s.closeSelection(selected)
		s.retireSelection(selected)
	}

	var selectionErr error

	if s.currentSelection() == nil && len(event.Snapshot.Devices) > 0 {
		_, selectionErr = s.setSelection(context.Background(), SelectionRequest{
			AttachmentID: event.Snapshot.Devices[0].Attachment.ID,
		})
	}

	snapshot := s.sessionSnapshot(event.Snapshot.Devices, selectionErr)
	if snapshot.Error == nil {
		snapshot.Error = event.Error
	}

	s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{
		Trigger:  event.Trigger,
		Snapshot: snapshot,
	})
}

func (s *Service) sessionSnapshot(
	devices []report.DeviceReport,
	sessionErr error,
) AuthenticatorSessionSnapshot {
	s.mu.Lock()
	selected := s.selected
	s.mu.Unlock()

	snapshot := AuthenticatorSessionSnapshot{
		Devices: devices,
		Error:   failure.Snapshot(sessionErr),
	}

	if selected != nil {
		active := activeSelection(selected)
		snapshot.Selection = &active
	}

	return snapshot
}

func attachmentPresent(devices []report.DeviceReport, id report.AttachmentID) bool {
	for _, device := range devices {
		if device.Attachment.ID == id {
			return true
		}
	}

	return false
}

func (s *Service) isClosed() bool {
	s.mu.Lock()

	closed := s.closed

	s.mu.Unlock()

	return closed
}

func closedServiceError(phase failure.Phase) error {
	return failure.New(
		failure.CodeOperationCanceled,
		failure.WithPhase(phase),
	)
}
