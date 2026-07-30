package service

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func TestDiscoverAutoSelectsFirstAndIdentityKeepsSelection(t *testing.T) {
	first := testDevice("device-1")
	second := testDevice("device-2")
	inventory := newFakeInventory([]report.DeviceReport{first, second})
	emitter := newCountingEmitter()
	service := New(WithEventEmitter(emitter))

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

	snapshot, err := service.Discover(t.Context())

	if err != nil || len(snapshot.Devices) != 2 || snapshot.Selection == nil {
		t.Fatalf("Discover = (%#v, %v)", snapshot, err)
	}

	selected := snapshot.Selection.ID

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

	waitFor(t, func() bool { return emitter.count(EventDiscoveryChanged) == 1 })

	if service.selected == nil || service.selected.id != selected {
		t.Fatalf("identity update changed selection: %#v", service.selected)
	}

	if err := service.close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestIdentityFailureDoesNotFailAuthenticatorSession(t *testing.T) {
	device := testDevice("device-1")
	inventory := newFakeInventory([]report.DeviceReport{device})
	emitted := make(chan DiscoveryChangedEnvelope, 1)
	service := New(WithEventEmitter(emitterFunc(func(name string, payload any) {
		if name == EventDiscoveryChanged {
			emitted <- payload.(DiscoveryChangedEnvelope)
		}
	})))

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

	initial, err := service.Discover(t.Context())
	if err != nil || initial.Selection == nil {
		t.Fatalf("Discover = (%#v, %v), want active selection", initial, err)
	}

	device.Resolution = report.IdentityResolution{
		State:    report.IdentityFailed,
		Provider: report.VendorYubico,
	}
	inventory.events <- ctapkit.InventoryEvent{
		Trigger: ctapkit.InventoryTriggerIdentity,
		Snapshot: ctapkit.InventorySnapshot{
			Devices: []report.DeviceReport{device},
		},
		Error: failure.Snapshot(failure.New(
			failure.CodeOperationTimeout,
			failure.WithPhase(failure.PhaseIdentity),
		)),
	}

	select {
	case event := <-emitted:
		if event.Snapshot.Error != nil {
			t.Fatalf("identity failure became session error: %#v", event.Snapshot.Error)
		}
		if event.Snapshot.Selection == nil ||
			event.Snapshot.Selection.ID != initial.Selection.ID {
			t.Fatalf("identity failure changed selection: %#v", event.Snapshot.Selection)
		}
		if got := event.Snapshot.Devices[0].Resolution.State; got != report.IdentityFailed {
			t.Fatalf("identity resolution state = %q, want failed", got)
		}
	case <-time.After(time.Second):
		t.Fatal("identity failure event was not emitted")
	}

	if err := service.close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestInventoryRemovalClosesSelectionBeforePublishingSnapshot(t *testing.T) {
	inventory := newFakeInventory([]report.DeviceReport{testDevice("device-1")})
	runtime := &fakeAuthenticatorRuntime{}
	emittedBeforeClose := atomic.Bool{}
	service := New(WithEventEmitter(emitterFunc(func(name string, _ any) {
		if name == EventDiscoveryChanged && !runtime.closed.Load() {
			emittedBeforeClose.Store(true)
		}
	})))

	service.openInventory = func(context.Context, transport.Mode) (inventoryRuntime, error) {
		return inventory, nil
	}

	service.openAuthenticator = func(
		context.Context,
		inventoryRuntime,
		report.AttachmentID,
		...ctapkit.AuthenticatorOption,
	) (openedAuthenticator, error) {
		return openedFor("device-1", runtime), nil
	}

	if _, err := service.Discover(t.Context()); err != nil {
		t.Fatalf("Discover: %v", err)
	}

	inventory.events <- ctapkit.InventoryEvent{
		Trigger:  ctapkit.InventoryTriggerTopology,
		Snapshot: ctapkit.InventorySnapshot{},
	}

	waitFor(t, func() bool {
		service.mu.Lock()
		defer service.mu.Unlock()

		return service.selected == nil && runtime.closed.Load()
	})
	if emittedBeforeClose.Load() {
		t.Fatal("removal snapshot was published before closing the authenticator")
	}

	if err := service.close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

type fakeInventory struct {
	mu        sync.Mutex
	snapshot  ctapkit.InventorySnapshot
	events    chan ctapkit.InventoryEvent
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

func (i *fakeInventory) OpenAuthenticator(
	context.Context,
	report.AttachmentID,
	...ctapkit.AuthenticatorOption,
) (*ctapkit.Authenticator, error) {
	return nil, errors.New("unexpected fake inventory open")
}

type emitterFunc func(string, any)

func (emit emitterFunc) Emit(name string, payload any) {
	emit(name, payload)
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
