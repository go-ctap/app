package service

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func (s *Service) Discover(ctx context.Context, req DiscoverRequest) (DiscoverySnapshot, error) {
	if err := s.ensureInventory(ctx, normalizedDiscoverMode(req.Mode)); err != nil {
		return DiscoverySnapshot{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return DiscoverySnapshot{Devices: s.devices}, nil
}

func (s *Service) RefreshDiscovery(ctx context.Context, req DiscoverRequest) error {
	mode := normalizedDiscoverMode(req.Mode)
	if req.Mode == "" {
		s.mu.Lock()
		if s.inventory != nil {
			mode = s.inventoryMode
		}
		s.mu.Unlock()
	}
	if err := s.ensureInventory(ctx, mode); err != nil {
		return err
	}

	s.mu.Lock()
	inventory := s.inventory
	s.mu.Unlock()

	return inventory.Refresh(ctx)
}

func (s *Service) ensureInventory(ctx context.Context, mode transport.Mode) error {
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
		currentMode := s.inventoryMode
		s.mu.Unlock()
		if currentMode != mode {
			return failure.New(
				failure.CodeTransportModeUnsupported,
				failure.WithPhase(failure.PhaseDiscovery),
			)
		}
		return nil
	}
	open := s.openInventory
	s.mu.Unlock()

	inventory, err := open(ctx, mode)
	if err != nil {
		return normalizeServicePhaseError(err, failure.PhaseDiscovery)
	}

	done := make(chan struct{})
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		_ = inventory.Close()
		return closedServiceError(failure.PhaseDiscovery)
	}
	s.inventory = inventory
	s.inventoryMode = mode
	s.inventoryDone = done
	s.devices = inventory.Snapshot().Devices
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
	}

	s.mu.Lock()
	if missing && s.selected == selected {
		s.selected = nil
	}
	s.devices = event.Snapshot.Devices
	s.mu.Unlock()

	s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{
		Trigger:  event.Trigger,
		Snapshot: &event.Snapshot,
		Error:    event.Error,
	})
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

func normalizedDiscoverMode(mode transport.Mode) transport.Mode {
	if mode == "" {
		return transport.ModeAuto
	}

	return mode
}

func closedServiceError(phase failure.Phase) error {
	return failure.New(
		failure.CodeOperationCanceled,
		failure.WithPhase(phase),
	)
}
