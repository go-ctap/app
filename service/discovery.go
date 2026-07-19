package service

import (
	"context"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func (s *Service) discoverSnapshot(ctx context.Context, req DiscoverRequest) (DiscoverySnapshot, error) {
	result, err := s.updateDiscovery(ctx, req)
	if err != nil {
		return DiscoverySnapshot{}, err
	}

	if result.snapshot == nil {
		return DiscoverySnapshot{}, result.err
	}

	return *result.snapshot, result.err
}

func (s *Service) RefreshDiscovery(ctx context.Context, req DiscoverRequest) error {
	effective := s.effectiveDiscoverRequest(req)
	started := time.Now()
	err := s.reconcileTopology(ctx, effective, DiscoveryTriggerManual, true)
	s.logs.Append(ctapkit.FinishLogEntry(model.LogEntry{
		Timestamp: started.UTC(),
		Layer:     model.LogLayerService,
		Code:      model.LogCodeDiscoveryRun,
		Params:    map[string]string{"trigger": string(DiscoveryTriggerManual)},
	}, started, err))

	return err
}

func (s *Service) reconcileTopology(
	ctx context.Context,
	req DiscoverRequest,
	trigger DiscoveryTrigger,
	force bool,
) error {
	result, err := s.updateDiscovery(ctx, req)
	if err != nil {
		return err
	}

	envelope := DiscoveryChangedEnvelope{
		Trigger:  trigger,
		Snapshot: result.snapshot,
		Error:    failure.Snapshot(result.err),
	}

	if force || result.changed || envelope.Error != nil {
		s.emit(EventDiscoveryChanged, envelope)

		entry := model.LogEntry{
			Timestamp:    time.Now().UTC(),
			Layer:        model.LogLayerService,
			Level:        model.LogLevelInfo,
			Outcome:      model.LogOutcomeEvent,
			Code:         model.LogCodeDiscoveryChanged,
			Params:       map[string]string{"trigger": string(trigger)},
			Error:        envelope.Error,
			ErrorMessage: ctapkit.TransportErrorMessage(result.err),
		}

		if envelope.Error != nil {
			entry.Level = model.LogLevelError
			entry.Outcome = model.LogOutcomeFailed
		}

		s.logs.Append(entry)
	}

	if result.snapshot != nil {
		s.startEnrichment()
	}

	return nil
}

type discoveryResult struct {
	snapshot *DiscoverySnapshot
	err      error
	changed  bool
}

func (s *Service) updateDiscovery(
	ctx context.Context,
	req DiscoverRequest,
) (discoveryResult, error) {
	result := discoveryResult{}
	if s.isClosed() {
		return result, closedServiceError(failure.PhaseDiscovery)
	}

	s.mu.Lock()
	previousDevices := s.devices
	s.mu.Unlock()
	previousReports := s.deviceReportsWithMetadata(previousDevices)

	devices, scanErr := s.scanDevices(ctx, normalizedDiscoverMode(req.Mode))
	if ctxErr := ctx.Err(); scanErr != nil && ctxErr != nil {
		return result, normalizeServicePhaseError(ctxErr, failure.PhaseDiscovery)
	}

	var nextReports []report.DeviceReport
	authoritative := scanErr == nil
	if authoritative {
		s.restoreDeviceMetadata(deviceReports(devices))
		nextReports = s.deviceReportsWithMetadata(devices)
	}

	releaseSelection, err := s.lockSelection(ctx)
	if err != nil {
		return result, err
	}
	defer releaseSelection()

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()

		return result, closedServiceError(failure.PhaseDiscovery)
	}

	var affected *selection
	if authoritative {
		s.pruneEnrichmentCacheLocked(devices)
		s.devices = devices
		s.lastDiscoverMode = normalizedDiscoverMode(req.Mode)
		affected = s.detachMissingSelectionLocked(nextReports)
	}
	s.mu.Unlock()

	var closeErr error
	if affected != nil {
		closeErr = s.closeSelection(affected)
	}

	result.err = scanErr
	if result.err == nil {
		result.err = closeErr
	}

	if authoritative {
		snapshot := DiscoverySnapshot{Devices: nextReports}
		result.snapshot = &snapshot
		result.changed = !deviceReportsEqual(previousReports, nextReports)
	}

	return result, nil
}

func (s *Service) detachMissingSelectionLocked(devices []report.DeviceReport) *selection {
	selected := s.selected
	if selected == nil || deviceReportPresent(devices, selected.device) {
		return nil
	}
	s.selected = nil

	return selected
}

func (s *Service) currentDiscoverRequest() DiscoverRequest {
	s.mu.Lock()
	mode := s.lastDiscoverMode
	s.mu.Unlock()

	return DiscoverRequest{Mode: mode}
}

func (s *Service) effectiveDiscoverRequest(req DiscoverRequest) DiscoverRequest {
	if req.Mode == "" {
		return s.currentDiscoverRequest()
	}

	return req
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

func deviceReportPresent(devices []report.DeviceReport, selected report.DeviceReport) bool {
	for _, device := range devices {
		if device.Transport == selected.Transport && device.Fingerprint == selected.Fingerprint {
			return true
		}
	}

	return false
}

func closedServiceError(phase failure.Phase) error {
	return failure.New(failure.CodeServiceClosed,
		failure.WithPhase(phase),
	)
}
