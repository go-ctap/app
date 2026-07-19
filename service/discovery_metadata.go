package service

import (
	"slices"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/report"
)

func (s *Service) deviceReportsWithMetadata(devices []ctapkit.Device) []report.DeviceReport {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.deviceReportsWithMetadataLocked(devices)
}

func (s *Service) deviceReportsWithMetadataLocked(devices []ctapkit.Device) []report.DeviceReport {
	reports := deviceReports(devices)
	for index := range reports {
		if cached, ok := s.enrichment.cache[reports[index].Fingerprint]; ok {
			reports[index].Metadata = cached
		}
	}

	return reports
}

func (s *Service) reportWithMetadata(device report.DeviceReport) report.DeviceReport {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cached, ok := s.enrichment.cache[device.Fingerprint]; ok {
		device.Metadata = cached
	}

	return device
}

func (s *Service) mergeInspectMetadata(selectionID SelectionID, result *model.InspectOutput) *DiscoverySnapshot {
	if result == nil {
		return nil
	}

	s.mu.Lock()
	selected := s.selected
	if selected == nil || selected.id != selectionID {
		s.mu.Unlock()

		return nil
	}

	key := selected.device.Fingerprint
	cached, cachedOK := s.enrichment.cache[key]
	if result.Result.Device.Metadata == nil {
		if cachedOK {
			result.Result.Device.Metadata = cached
		}
		s.mu.Unlock()

		return nil
	}

	metadata := result.Result.Device.Metadata
	fingerprint := selected.device.Fingerprint
	changed := !cachedOK || !deviceMetadataEqual(*cached, *metadata)
	s.enrichment.cache[key] = metadata

	selected.device.Metadata = result.Result.Device.Metadata

	var snapshot *DiscoverySnapshot
	if changed {
		snapshot = &DiscoverySnapshot{Devices: s.deviceReportsWithMetadataLocked(s.devices)}
	}
	s.mu.Unlock()

	s.persistDeviceMetadata(fingerprint, *metadata)
	return snapshot
}

func (s *Service) pruneEnrichmentCacheLocked(devices []ctapkit.Device) {
	present := make(map[string]struct{}, len(devices))
	for _, device := range devices {
		present[device.Report().Fingerprint] = struct{}{}
	}

	for key := range s.enrichment.cache {
		if _, ok := present[key]; !ok {
			delete(s.enrichment.cache, key)
		}
	}
}

func deviceReportsEqual(first, second []report.DeviceReport) bool {
	return slices.EqualFunc(first, second, func(left, right report.DeviceReport) bool {
		leftMetadata := left.Metadata
		rightMetadata := right.Metadata

		left.Metadata = nil
		right.Metadata = nil

		if left != right {
			return false
		}

		if leftMetadata == nil || rightMetadata == nil {
			return leftMetadata == rightMetadata
		}

		return deviceMetadataEqual(*leftMetadata, *rightMetadata)
	})
}

func deviceMetadataEqual(first, second report.DeviceMetadata) bool {
	if first.Model != second.Model || first.Serial != second.Serial || first.Firmware != second.Firmware {
		return false
	}

	return slices.EqualFunc(first.Interfaces, second.Interfaces, func(left, right report.InterfaceReport) bool {
		return left.Interface == right.Interface &&
			slices.Equal(left.Supported, right.Supported) &&
			slices.Equal(left.Enabled, right.Enabled)
	})
}
