package service

import (
	"context"
	"time"

	ctapdiscover "github.com/go-ctap/ctap/discover"
	"github.com/go-ctap/kit/model/failure"
)

const discoveryEventSettleTime = 100 * time.Millisecond

func (s *Service) StartDiscoveryMonitoring(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return normalizeServicePhaseError(err, failure.PhaseDiscovery)
	}

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return closedServiceError(failure.PhaseDiscovery)
	}

	if s.monitorCancel != nil {
		s.mu.Unlock()
		return nil
	}
	s.mu.Unlock()

	monitorCtx, monitorCancel := context.WithCancel(context.Background())
	stopCancelOnCallerDone := context.AfterFunc(ctx, monitorCancel)
	events, err := s.openMonitor(monitorCtx, s.currentDiscoverRequest().Mode)
	stopCancelOnCallerDone()
	if err != nil {
		monitorCancel()
		if ctx.Err() != nil {
			return normalizeServicePhaseError(ctx.Err(), failure.PhaseDiscovery)
		}

		return normalizeServicePhaseError(err, failure.PhaseDiscovery)
	}

	if err := ctx.Err(); err != nil {
		monitorCancel()

		return normalizeServicePhaseError(err, failure.PhaseDiscovery)
	}
	done := make(chan struct{})

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		monitorCancel()

		return closedServiceError(failure.PhaseDiscovery)
	}

	if s.monitorCancel != nil {
		s.mu.Unlock()
		monitorCancel()

		return nil
	}
	s.monitorCancel = monitorCancel
	s.monitorDone = done
	go s.runDiscoveryMonitor(monitorCtx, monitorCancel, events, done)
	s.mu.Unlock()

	reconcileErr := s.reconcileTopology(ctx, s.currentDiscoverRequest(), DiscoveryTriggerMonitor, false)
	if reconcileErr != nil {
		s.mu.Lock()
		if s.monitorDone == done {
			s.monitorCancel = nil
			s.monitorDone = nil
		}
		s.mu.Unlock()
		monitorCancel()
		<-done

		return reconcileErr
	}

	return nil
}

func (s *Service) runDiscoveryMonitor(
	ctx context.Context,
	cancel context.CancelFunc,
	events <-chan ctapdiscover.Event,
	done chan struct{},
) {
	defer func() {
		close(done)

		s.mu.Lock()
		if s.monitorDone == done {
			s.monitorCancel = nil
			s.monitorDone = nil
		}
		s.mu.Unlock()
	}()
	defer cancel()

	var timer *time.Timer
	var timerC <-chan time.Time
	pending := false

	stopTimer := func() {
		if timer == nil {
			return
		}

		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
	}
	defer stopTimer()

	flush := func() {
		if !pending {
			return
		}

		pending = false
		_ = s.reconcileTopology(ctx, s.currentDiscoverRequest(), DiscoveryTriggerHotplug, false)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}

			if event.Err != nil {
				s.emitDiscoveryMonitorFailure(event.Err)

				return
			}

			pending = true
			if timer == nil {
				timer = time.NewTimer(discoveryEventSettleTime)
			} else {
				stopTimer()
				timer.Reset(discoveryEventSettleTime)
			}
			timerC = timer.C
		case <-timerC:
			timerC = nil
			flush()
		}
	}
}

func (s *Service) emitDiscoveryMonitorFailure(err error) {
	monitorErr := failure.Wrap(
		failure.CodeTransportFailure,
		err,
		failure.WithPhase(failure.PhaseDiscovery),
	)
	envelope := DiscoveryChangedEnvelope{
		Trigger: DiscoveryTriggerHotplug,
		Error:   failure.Snapshot(monitorErr),
	}
	s.emit(EventDiscoveryChanged, envelope)
}
