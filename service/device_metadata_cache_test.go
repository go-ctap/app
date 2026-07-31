package service

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	ctapkit "github.com/go-ctap/kit"
)

func TestApplyDeviceUpdatePersistsMetadataCache(t *testing.T) {
	path := filepath.Join(t.TempDir(), "Telesma", "device-metadata.json")
	want := []byte(`{"version":1,"attachments":{}}`)
	service := New()
	service.metadataCachePath = path

	service.applyDeviceUpdate(deviceManagerState{update: ctapkit.DeviceUpdate{
		DeviceMetadataCache: want,
	}})

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read metadata cache: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("metadata cache = %q, want %q", got, want)
	}
}
