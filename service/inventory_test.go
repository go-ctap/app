package service

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func TestInventoryIdentityEventKeepsAttachmentOrderAndSelection(t *testing.T) {
	first := testDevice("device-1")
	second := testDevice("device-2")
	inventory := newFakeInventory([]report.DeviceReport{first, second})
	service := New()

	service.openInventory = func(context.Context, transport.Mode) (inventoryRuntime, error) {
		return inventory, nil
	}
	service.openAuthenticator = func(
		context.Context,
		inventoryRuntime,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		return openedFor("device-1", &fakeAuthenticatorRuntime{}), nil
	}

	snapshot, err := service.Discover(t.Context(), DiscoverRequest{})

	if err != nil || len(snapshot.Devices) != 2 {
		t.Fatalf("Discover = (%#v, %v)", snapshot, err)
	}

	selected := mustSelect(t, service, "device-1")

	first.Identity = &report.DeviceIdentity{
		Vendor: report.VendorToken2,
		Model:  "Token2 Dual NFC PIN+ PIV+",
		Serial: "66103930925563",
	}
	first.Resolution = report.IdentityResolution{
		State:    report.IdentityResolved,
		Provider: report.VendorToken2,
	}
	inventory.events <- ctapkit.InventoryEvent{
		Trigger: ctapkit.InventoryTriggerIdentity,
		Snapshot: ctapkit.InventorySnapshot{
			Devices: []report.DeviceReport{first, second},
		},
	}

	waitFor(t, func() bool {
		service.mu.Lock()
		defer service.mu.Unlock()

		return service.devices[0].Identity != nil
	})
	if service.devices[0].Attachment.ID != "device-1" ||
		service.devices[1].Attachment.ID != "device-2" {
		t.Fatalf("identity update reordered devices: %#v", service.devices)
	}

	if service.selected == nil || service.selected.id != selected.ID {
		t.Fatalf("identity update changed selection: %#v", service.selected)
	}

	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestInventoryRemovalClosesSelectionBeforePublishingSnapshot(t *testing.T) {
	inventory := newFakeInventory([]report.DeviceReport{testDevice("device-1")})
	service := New()

	service.openInventory = func(context.Context, transport.Mode) (inventoryRuntime, error) {
		return inventory, nil
	}

	closedWhilePresent := atomic.Bool{}
	runtime := &fakeAuthenticatorRuntime{onClose: func() {
		service.mu.Lock()
		defer service.mu.Unlock()
		closedWhilePresent.Store(attachmentPresent(service.devices, "device-1"))
	}}

	service.openAuthenticator = func(
		context.Context,
		inventoryRuntime,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		return openedFor("device-1", runtime), nil
	}

	if _, err := service.Discover(t.Context(), DiscoverRequest{}); err != nil {
		t.Fatalf("Discover: %v", err)
	}

	mustSelect(t, service, "device-1")
	inventory.events <- ctapkit.InventoryEvent{
		Trigger:  ctapkit.InventoryTriggerTopology,
		Snapshot: ctapkit.InventorySnapshot{},
	}

	waitFor(t, func() bool {
		service.mu.Lock()
		defer service.mu.Unlock()

		return service.selected == nil && len(service.devices) == 0
	})
	if !runtime.closed.Load() || !closedWhilePresent.Load() {
		t.Fatal("selected authenticator was not closed before attachment removal")
	}

	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

type fakeInventory struct {
	mu        sync.Mutex
	snapshot  ctapkit.InventorySnapshot
	events    chan ctapkit.InventoryEvent
	refreshes atomic.Int32
	closeOnce sync.Once
}

func newFakeInventory(devices []report.DeviceReport) *fakeInventory {
	return &fakeInventory{
		snapshot: ctapkit.InventorySnapshot{Devices: devices},
		events:   make(chan ctapkit.InventoryEvent, 4),
	}
}

func (i *fakeInventory) Snapshot() ctapkit.InventorySnapshot {
	i.mu.Lock()
	defer i.mu.Unlock()

	return i.snapshot
}

func (i *fakeInventory) Events() <-chan ctapkit.InventoryEvent {
	return i.events
}

func (i *fakeInventory) Refresh(context.Context) error {
	i.refreshes.Add(1)

	return nil
}

func (i *fakeInventory) OpenAuthenticator(
	context.Context,
	report.AttachmentID,
	...ctapkit.AuthenticatorOption,
) (*ctapkit.Authenticator, error) {
	return nil, errors.New("unexpected fake inventory open")
}

func (i *fakeInventory) Close() error {
	i.closeOnce.Do(func() {
		close(i.events)
	})

	return nil
}

func waitFor(t *testing.T, condition func() bool) {
	t.Helper()

	deadline := time.Now().Add(time.Second)

	for time.Now().Before(deadline) {
		if condition() {
			return
		}

		time.Sleep(time.Millisecond)
	}

	t.Fatal("condition was not met")
}
