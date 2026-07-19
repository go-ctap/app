package service

import (
	"context"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/report"
)

const enrichmentProbeTimeout = 2 * time.Second

type discoveryEnrichment struct {
	running bool
	cancel  context.CancelFunc
	done    chan struct{}
	cache   map[string]*report.DeviceMetadata
}

func newDiscoveryEnrichment() discoveryEnrichment {
	return discoveryEnrichment{
		cache: make(map[string]*report.DeviceMetadata),
	}
}

func (s *Service) startEnrichment() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()

		return
	}

	if s.enrichment.running {
		s.mu.Unlock()

		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.enrichment.running = true
	s.enrichment.cancel = cancel
	s.enrichment.done = make(chan struct{})
	s.mu.Unlock()

	go s.runEnrichment(ctx)
}

func (s *Service) runEnrichment(ctx context.Context) {
	attempted := make(map[string]struct{})
	for {
		device, ok := s.nextEnrichmentCandidate(ctx, attempted)
		if !ok {
			return
		}
		deviceReport := device.Report()

		probeCtx, cancel := context.WithTimeout(ctx, enrichmentProbeTimeout)
		metadata, err := ctapkit.ProbeDeviceMetadata(probeCtx, device)
		cancel()

		if err == nil && metadata != nil {
			s.applyEnrichment(deviceReport, metadata)
		}
	}
}

func (s *Service) nextEnrichmentCandidate(
	ctx context.Context,
	attempted map[string]struct{},
) (ctapkit.Device, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx.Err() != nil || s.closed {
		s.finishEnrichmentLocked()

		return ctapkit.Device{}, false
	}

	candidate, ok := takeEnrichmentCandidate(
		deviceReports(s.devices),
		s.enrichment.cache,
		attempted,
	)
	if ok {
		for _, device := range s.devices {
			report := device.Report()
			if report.Transport == candidate.Transport && report.Fingerprint == candidate.Fingerprint {
				return device, true
			}
		}
	}

	s.finishEnrichmentLocked()

	return ctapkit.Device{}, false
}

func takeEnrichmentCandidate(
	devices []report.DeviceReport,
	cache map[string]*report.DeviceMetadata,
	attempted map[string]struct{},
) (report.DeviceReport, bool) {
	for _, device := range devices {
		if !ctapkit.CanProbeDeviceMetadata(device) {
			continue
		}

		key := device.Fingerprint
		if _, ok := cache[key]; ok {
			continue
		}

		if _, ok := attempted[key]; ok {
			continue
		}

		attempted[key] = struct{}{}

		return device, true
	}

	return report.DeviceReport{}, false
}

func (s *Service) finishEnrichmentLocked() {
	if !s.enrichment.running {
		return
	}

	s.enrichment.running = false
	s.enrichment.cancel = nil
	close(s.enrichment.done)
	s.enrichment.done = nil
}

func (s *Service) applyEnrichment(device report.DeviceReport, metadata *report.DeviceMetadata) {
	s.persistDeviceMetadata(device.Fingerprint, *metadata)

	s.mu.Lock()
	if s.closed || !deviceReportPresent(deviceReports(s.devices), device) {
		s.mu.Unlock()

		return
	}

	s.enrichment.cache[device.Fingerprint] = metadata
	snapshot := DiscoverySnapshot{Devices: s.deviceReportsWithMetadataLocked(s.devices)}
	s.mu.Unlock()

	s.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{
		Trigger:  DiscoveryTriggerEnriched,
		Snapshot: &snapshot,
	})
}
