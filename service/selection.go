package service

import (
	"context"
	"strings"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
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

type selectedDevice struct {
	handle ctapkit.Device
	report report.DeviceReport
}

type authenticatorLifecycle interface {
	Close() error
	Closed() bool
}

type openedAuthenticator struct {
	client    *ctapkit.Authenticator
	lifecycle authenticatorLifecycle
}

func newOpenedAuthenticator(client *ctapkit.Authenticator) openedAuthenticator {
	return openedAuthenticator{client: client, lifecycle: client}
}

func (a openedAuthenticator) Close() error {
	return a.lifecycle.Close()
}

func (a openedAuthenticator) Closed() bool {
	return a.lifecycle.Closed()
}

type openAuthenticatorFunc func(
	context.Context,
	ctapkit.Device,
	...ctapkit.AuthenticatorOption,
) (openedAuthenticator, error)

func newSelection(id SelectionID, device report.DeviceReport, runtime openedAuthenticator) *selection {
	return &selection{
		id:         id,
		device:     device,
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
		return SelectionSnapshot{}, closedServiceError(failure.PhaseSelection)
	}

	selector := strings.TrimSpace(req.Selector)
	if selector == "" {
		selected := s.takeSelection()
		if selected == nil {
			return SelectionSnapshot{}, nil
		}

		defer s.startEnrichment()
		return SelectionSnapshot{}, s.closeSelection(selected)
	}

	device, err := s.selectDevice(selector)
	if err != nil {
		return SelectionSnapshot{}, err
	}

	if selected := s.currentSelection(); selected != nil &&
		selected.device.Transport == device.report.Transport &&
		selected.device.Fingerprint == device.report.Fingerprint {
		snapshot := ActiveSelection{ID: selected.id}

		return SelectionSnapshot{Selection: &snapshot}, nil
	}

	if previous := s.takeSelection(); previous != nil {
		_ = s.closeSelection(previous)
	}

	selected, err := s.openSelection(ctx, req, device)
	if err != nil {
		return SelectionSnapshot{}, err
	}

	s.mu.Lock()
	s.selected = selected
	s.mu.Unlock()

	snapshot := ActiveSelection{ID: selected.id}

	return SelectionSnapshot{Selection: &snapshot}, nil
}

func (s *Service) Close() error {
	s.selectionGate <- struct{}{}
	defer func() { <-s.selectionGate }()

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()

		return nil
	}

	s.closed = true
	monitorCancel, monitorDone := s.monitorCancel, s.monitorDone
	enrichmentCancel, enrichmentDone := s.enrichment.cancel, s.enrichment.done
	s.monitorCancel, s.monitorDone = nil, nil
	selected := s.selected
	s.selected = nil
	s.mu.Unlock()

	if enrichmentCancel != nil {
		enrichmentCancel()
	}

	if monitorCancel != nil {
		monitorCancel()
	}

	if monitorDone != nil {
		<-monitorDone
	}

	if enrichmentDone != nil {
		<-enrichmentDone
	}

	if selected != nil {
		return s.closeSelection(selected)
	}

	return nil
}

func (s *Service) selectDevice(selector string) (selectedDevice, error) {
	s.mu.Lock()
	devices := s.devices
	s.mu.Unlock()

	return s.resolveDevice(devices, selector)
}

func (s *Service) currentSelection() *selection {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.selected
}

func (s *Service) takeSelection() *selection {
	s.mu.Lock()
	defer s.mu.Unlock()

	selected := s.selected
	s.selected = nil

	return selected
}

func (s *Service) openSelection(
	ctx context.Context,
	req SelectionRequest,
	device selectedDevice,
) (selected *selection, returnErr error) {
	selectionID := SelectionID(uuid.NewString())
	started := time.Now()
	defer func() {
		entry := model.LogEntry{
			Timestamp:   started.UTC(),
			Layer:       model.LogLayerSelection,
			Code:        model.LogCodeSelectionOpen,
			SelectionID: string(selectionID),
		}
		s.logs.Append(ctapkit.FinishLogEntry(entry, started, returnErr))
	}()

	opts := []ctapkit.AuthenticatorOption{
		ctapkit.WithLogJournal(s.logs),
	}

	runtime, err := s.openAuthenticator(
		ctapkit.WithLogCorrelation(ctx, string(selectionID), "", ""),
		device.handle,
		opts...,
	)
	if err != nil {
		return nil, err
	}

	return newSelection(selectionID, s.reportWithMetadata(device.report), runtime), nil
}

func (s *Service) closeSelection(selected *selection) (returnErr error) {
	started := time.Now()
	defer func() {
		s.logs.Append(ctapkit.FinishLogEntry(model.LogEntry{
			Timestamp:   started.UTC(),
			Layer:       model.LogLayerSelection,
			Code:        model.LogCodeSelectionClose,
			SelectionID: string(selected.id),
		}, started, returnErr))
	}()

	s.cancelAndWait(selected)

	return selected.runtime.Close()
}

func (s *Service) lockSelection(ctx context.Context) (func(), error) {
	select {
	case s.selectionGate <- struct{}{}:
		return func() { <-s.selectionGate }, nil
	case <-ctx.Done():
		return nil, normalizeServicePhaseError(ctx.Err(), failure.PhaseSelection)
	}
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
