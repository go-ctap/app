package service

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-ctap/kit/model/report"
)

const deviceMetadataCacheFile = "info.json"

func defaultDeviceMetadataCacheDir() string {
	root, err := os.UserCacheDir()
	if err != nil {
		return ""
	}

	return filepath.Join(root, "ctapkit", "devices")
}

func (s *Service) restoreDeviceMetadata(devices []report.DeviceReport) {
	restored := make(map[string]*report.DeviceMetadata)

	s.deviceMetadataCacheMu.Lock()
	for _, device := range devices {
		metadata, ok := readDeviceMetadata(s.deviceMetadataCacheDir, device.Fingerprint)
		if ok {
			restored[device.Fingerprint] = &metadata
		}
	}
	s.deviceMetadataCacheMu.Unlock()

	if len(restored) == 0 {
		return
	}

	s.mu.Lock()
	for key, metadata := range restored {
		if _, exists := s.enrichment.cache[key]; !exists {
			s.enrichment.cache[key] = metadata
		}
	}
	s.mu.Unlock()
}

func (s *Service) persistDeviceMetadata(fingerprint string, metadata report.DeviceMetadata) {
	s.deviceMetadataCacheMu.Lock()
	defer s.deviceMetadataCacheMu.Unlock()

	_ = writeDeviceMetadata(s.deviceMetadataCacheDir, fingerprint, metadata)
}

func readDeviceMetadata(cacheDir, fingerprint string) (report.DeviceMetadata, bool) {
	path, ok := deviceMetadataCachePath(cacheDir, fingerprint)
	if !ok {
		return report.DeviceMetadata{}, false
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return report.DeviceMetadata{}, false
	}

	var metadata report.DeviceMetadata
	if err := json.Unmarshal(data, &metadata); err != nil || !deviceMetadataPresent(metadata) {
		return report.DeviceMetadata{}, false
	}

	return metadata, true
}

func writeDeviceMetadata(cacheDir, fingerprint string, metadata report.DeviceMetadata) error {
	path, ok := deviceMetadataCachePath(cacheDir, fingerprint)
	if !ok || !deviceMetadataPresent(metadata) {
		return nil
	}

	data, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}

	return os.WriteFile(path, data, 0o600)
}

func deviceMetadataCachePath(cacheDir, fingerprint string) (string, bool) {
	cacheDir = strings.TrimSpace(cacheDir)
	fingerprint = strings.TrimSpace(fingerprint)
	if cacheDir == "" || !validCacheFingerprint(fingerprint) {
		return "", false
	}

	return filepath.Join(cacheDir, fingerprint, deviceMetadataCacheFile), true
}

func validCacheFingerprint(fingerprint string) bool {
	if fingerprint == "" {
		return false
	}

	for index := range len(fingerprint) {
		value := fingerprint[index]
		if value >= 'a' && value <= 'z' ||
			value >= 'A' && value <= 'Z' ||
			value >= '0' && value <= '9' ||
			value == '-' || value == '_' {
			continue
		}

		return false
	}

	return true
}

func deviceMetadataPresent(metadata report.DeviceMetadata) bool {
	return metadata.Model != "" || metadata.Serial != "" || metadata.Firmware != "" || len(metadata.Interfaces) != 0
}
