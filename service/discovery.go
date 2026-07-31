package service

import (
	"context"
	"os"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"

	"telesma/internal/atomicfile"
)

// Discover starts device monitoring or republishes its current state. The
// initial state and every later change are published through EventDiscoveryChanged.
func (s *Service) Discover(ctx context.Context) error {
	return s.ensureDeviceManager(ctx)
}

func (s *Service) ensureDeviceManager(ctx context.Context) error {
	unlock, err := s.lockSelection(ctx)
	if err != nil {
		return err
	}
	defer unlock()

	s.mu.Lock()
	if s.devices != nil {
		snapshot := s.sessionSnapshotLocked()
		s.mu.Unlock()
		s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{Snapshot: snapshot})

		return nil
	}
	open := s.openDeviceManager
	deviceContext := s.deviceContext
	s.mu.Unlock()

	options := []ctapkit.AuthenticatorOption{ctapkit.WithLogJournal(s.logs)}
	if s.metadataCachePath != "" {
		cache, cacheErr := os.ReadFile(s.metadataCachePath)
		if cacheErr == nil && len(cache) != 0 {
			options = append(options, ctapkit.WithDeviceMetadataCache(cache))
		}
	}
	manager, err := open(deviceContext, transport.ModeAuto, options...)
	if err != nil {
		return ctapkit.NormalizeError(err, failure.PhaseDiscovery)
	}
	initial, ok := manager.Next()
	if !ok {
		_ = manager.Close()

		return closedServiceError(failure.PhaseDiscovery)
	}
	done := make(chan struct{})

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		_ = manager.Close()

		return closedServiceError(failure.PhaseDiscovery)
	}
	s.devices = manager
	s.devicesDone = done
	s.mu.Unlock()

	snapshot := s.applyDeviceUpdate(initial)
	s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{Snapshot: snapshot})
	go s.forwardDeviceUpdates(manager, done)

	return nil
}

func (s *Service) forwardDeviceUpdates(
	manager deviceManagerRuntime,
	done chan struct{},
) {
	defer close(done)

	for {
		update, ok := manager.Next()
		if !ok {
			return
		}

		unlock, err := s.lockSelection(context.Background())
		if err != nil {
			return
		}

		s.mu.Lock()
		current := s.devices
		s.mu.Unlock()
		if current == manager {
			snapshot := s.applyDeviceUpdate(update)
			s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{Snapshot: snapshot})
		}
		unlock()
	}
}

func (s *Service) applyDeviceUpdate(
	state deviceManagerState,
) AuthenticatorSessionSnapshot {
	if s.metadataCachePath != "" && len(state.update.DeviceMetadataCache) != 0 {
		_ = atomicfile.WriteFile(
			s.metadataCachePath,
			state.update.DeviceMetadataCache,
			0o600,
			0o700,
		)
	}
	s.reconcileSelection(state.runtime)

	s.mu.Lock()
	s.deviceSnapshot = state.update.Snapshot
	s.deviceError = state.update.Error
	snapshot := s.sessionSnapshotLocked()
	s.mu.Unlock()

	return snapshot
}

func (s *Service) sessionSnapshotLocked() AuthenticatorSessionSnapshot {
	devices := s.deviceSnapshot.Devices
	if devices == nil {
		devices = []report.DeviceReport{}
	}
	snapshot := AuthenticatorSessionSnapshot{
		Devices: devices,
		Error:   s.deviceError,
	}
	if s.selected != nil {
		snapshot.Selection = &ActiveSelection{
			ID:           s.selected.id,
			AttachmentID: s.selected.device.Attachment.ID,
		}
	}

	return snapshot
}

func closedServiceError(phase failure.Phase) error {
	return failure.New(
		failure.CodeOperationCanceled,
		failure.WithPhase(phase),
	)
}
