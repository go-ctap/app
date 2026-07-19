package service

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	ctapdiscover "github.com/go-ctap/ctap/discover"
	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/transport"
)

func TestTopologyReconciliationClosesMissingSelection(t *testing.T) {
	firstDevice := testDevice("hid://one", "serial-1")
	secondDevice := testDevice("hid://two", "serial-2")
	firstRuntime := &fakeAuthenticatorRuntime{}
	service := New()
	service.selected = testSelection("selection-1", firstDevice, firstRuntime)

	service.mu.Lock()
	affected := service.detachMissingSelectionLocked([]report.DeviceReport{secondDevice})
	service.mu.Unlock()
	err := service.closeSelection(affected)
	if err != nil {
		t.Fatalf("close selection: %v", err)
	}

	if !firstRuntime.closed.Load() {
		t.Fatal("missing selection runtime was not closed")
	}

	if service.selected != nil {
		t.Fatal("missing selection was retained")
	}
}

func TestDiscoverKeepsCurrentSelection(t *testing.T) {
	device := testDevice("hid://one", "serial-1")
	runtime := &fakeAuthenticatorRuntime{}
	service := New()
	service.selected = testSelection("selection-1", device, runtime)
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		return nil, nil
	}

	snapshot, err := service.Discover(context.Background(), DiscoverRequest{Mode: transport.ModeHID})
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	if len(snapshot.Devices) != 0 || !runtime.closed.Load() {
		t.Fatalf("snapshot = %#v, runtime closed = %v", snapshot, runtime.closed.Load())
	}
}

func TestRefreshDiscoveryPublishesFailureAndRetainsMode(t *testing.T) {
	emitter := &recordingEmitter{events: make(chan DiscoveryChangedEnvelope, 1)}
	service := New(WithEventEmitter(emitter))
	service.lastDiscoverMode = transport.ModeHID
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		return nil, failure.New(
			failure.CodeTransportFailure,
			failure.WithPhase(failure.PhaseDiscovery),
		)
	}

	if err := service.RefreshDiscovery(context.Background(), DiscoverRequest{}); err != nil {
		t.Fatalf("RefreshDiscovery: %v", err)
	}

	if service.lastDiscoverMode != transport.ModeHID {
		t.Fatalf("last mode = %q, want HID", service.lastDiscoverMode)
	}

	select {
	case emitted := <-emitter.events:
		if emitted.Trigger != DiscoveryTriggerManual || emitted.Snapshot != nil ||
			emitted.Error == nil || emitted.Error.Code != failure.CodeTransportFailure ||
			emitted.Error.Phase != failure.PhaseDiscovery {
			t.Fatalf("failure envelope = %#v", emitted)
		}
	case <-time.After(time.Second):
		t.Fatal("manual discovery event was not emitted")
	}
}

func TestDiscoveryEventFollowsOperationCancellation(t *testing.T) {
	device := testDevice("hid://one", "serial-1")
	operationID := OperationID("operation-1")
	var canceled atomic.Bool
	observed := make(chan bool, 1)
	service := New(WithEventEmitter(eventEmitterFunc(func(name string, payload any) {
		if name == EventDiscoveryChanged {
			observed <- canceled.Load()
		}
	})))
	selected := testSelection(
		"selection-1",
		device,
		&fakeAuthenticatorRuntime{},
	)
	service.selected = selected
	operation := &operationState{
		id:          operationID,
		selectionID: "selection-1",
		done:        make(chan struct{}),
	}
	var cancelOnce sync.Once
	operation.cancel = func() {
		cancelOnce.Do(func() {
			canceled.Store(true)
			service.unregisterOperation(selected, operationID)
		})
	}
	selected.operations[operationID] = operation
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		return nil, nil
	}

	err := service.reconcileTopology(
		context.Background(),
		DiscoverRequest{Mode: transport.ModeHID},
		DiscoveryTriggerHotplug,
		true,
	)
	if err != nil {
		t.Fatalf("reconcile topology: %v", err)
	}

	select {
	case wasCanceled := <-observed:
		if !wasCanceled {
			t.Fatal("event was emitted before cancellation")
		}
	case <-time.After(time.Second):
		t.Fatal("discovery event was not emitted")
	}
}

func TestDiscoveryMonitorCoalescesEventBurst(t *testing.T) {
	monitor := newFakeDiscoveryMonitor()
	service := New()
	var opens atomic.Int32
	service.openMonitor = func(ctx context.Context, _ transport.Mode) (<-chan ctapdiscover.Event, error) {
		opens.Add(1)
		return monitor.open(ctx), nil
	}
	scans := make(chan struct{}, 8)
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		scans <- struct{}{}
		return nil, nil
	}

	if err := service.StartDiscoveryMonitoring(context.Background()); err != nil {
		t.Fatalf("StartDiscoveryMonitoring: %v", err)
	}

	if err := service.StartDiscoveryMonitoring(context.Background()); err != nil {
		t.Fatalf("second StartDiscoveryMonitoring: %v", err)
	}

	if opens.Load() != 1 {
		t.Fatalf("monitor opens = %d, want 1", opens.Load())
	}
	waitForScan(t, scans)

	monitor.events <- ctapdiscover.Event{}
	monitor.events <- ctapdiscover.Event{}
	monitor.events <- ctapdiscover.Event{}
	waitForScan(t, scans)
	select {
	case <-scans:
		t.Fatal("discovery burst caused more than one rescan")
	case <-time.After(2 * discoveryEventSettleTime):
	}

	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	if !monitor.isCanceled() {
		t.Fatal("discovery monitor context was not canceled")
	}
}

func TestDiscoveryMonitorOutlivesStartContext(t *testing.T) {
	monitor := newFakeDiscoveryMonitor()
	service := New()
	service.openMonitor = func(ctx context.Context, _ transport.Mode) (<-chan ctapdiscover.Event, error) {
		return monitor.open(ctx), nil
	}
	scans := make(chan struct{}, 2)
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		scans <- struct{}{}
		return nil, nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	if err := service.StartDiscoveryMonitoring(ctx); err != nil {
		t.Fatalf("StartDiscoveryMonitoring: %v", err)
	}
	waitForScan(t, scans)
	cancel()

	monitor.events <- ctapdiscover.Event{}
	waitForScan(t, scans)
	if monitor.isCanceled() {
		t.Fatal("caller context stopped the persistent discovery monitor")
	}

	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestDiscoveryMonitorPublishesSourceFailure(t *testing.T) {
	monitor := newFakeDiscoveryMonitor()
	emitter := &recordingEmitter{events: make(chan DiscoveryChangedEnvelope, 1)}
	service := New(WithEventEmitter(emitter))
	service.openMonitor = func(ctx context.Context, _ transport.Mode) (<-chan ctapdiscover.Event, error) {
		return monitor.open(ctx), nil
	}
	service.scanDevices = func(context.Context, transport.Mode) ([]ctapkit.Device, error) {
		return nil, nil
	}

	if err := service.StartDiscoveryMonitoring(context.Background()); err != nil {
		t.Fatalf("StartDiscoveryMonitoring: %v", err)
	}
	monitor.events <- ctapdiscover.Event{Err: errors.New("monitor unavailable")}

	select {
	case emitted := <-emitter.events:
		if emitted.Trigger != DiscoveryTriggerHotplug || emitted.Snapshot != nil ||
			emitted.Error == nil || emitted.Error.Code != failure.CodeTransportFailure ||
			emitted.Error.Phase != failure.PhaseDiscovery {
			t.Fatalf("monitor failure envelope = %#v", emitted)
		}
	case <-time.After(time.Second):
		t.Fatal("monitor failure event was not emitted")
	}

	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestServiceDoesNotEmitAfterClose(t *testing.T) {
	emitter := &recordingEmitter{events: make(chan DiscoveryChangedEnvelope, 1)}
	service := New(WithEventEmitter(emitter))
	if err := service.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	service.emit(EventDiscoveryChanged, DiscoveryChangedEnvelope{
		Trigger: DiscoveryTriggerHotplug,
	})

	select {
	case event := <-emitter.events:
		t.Fatalf("event emitted after close: %#v", event)
	default:
	}
}

func TestDeviceReportPresentUsesTransportAndFingerprint(t *testing.T) {
	first := testDevice("hid://one", "fingerprint-1")
	sameAttachment := first
	sameAttachment.Product = "refreshed metadata"
	if !deviceReportPresent([]report.DeviceReport{first}, sameAttachment) {
		t.Fatal("matching fingerprint was not present")
	}

	reinserted := testDevice("hid://two", "fingerprint-2")
	if deviceReportPresent([]report.DeviceReport{first}, reinserted) {
		t.Fatal("changed attachment fingerprint was still present")
	}

	otherTransport := first
	otherTransport.Transport = transport.ModeWindowsProxy
	if deviceReportPresent([]report.DeviceReport{first}, otherTransport) {
		t.Fatal("devices on different transports matched")
	}
}

func testDevice(path string, fingerprint string) report.DeviceReport {
	return report.DeviceReport{
		Fingerprint: fingerprint,
		Transport:   transport.ModeHID,
		Path:        path,
		VendorID:    1,
		ProductID:   2,
	}
}

func testSelection(id SelectionID, device report.DeviceReport, runtime authenticatorLifecycle) *selection {
	return newSelection(id, device, openedAuthenticator{lifecycle: runtime})
}

func waitForScan(t *testing.T, scans <-chan struct{}) {
	t.Helper()

	select {
	case <-scans:
	case <-time.After(time.Second):
		t.Fatal("discovery scan did not run")
	}
}

type recordingEmitter struct {
	events chan DiscoveryChangedEnvelope
}

func (e *recordingEmitter) Emit(name string, payload any) {
	if name != EventDiscoveryChanged {
		return
	}

	if envelope, ok := payload.(DiscoveryChangedEnvelope); ok {
		e.events <- envelope
	}
}

type eventEmitterFunc func(name string, payload any)

func (f eventEmitterFunc) Emit(name string, payload any) {
	f(name, payload)
}

type fakeDiscoveryMonitor struct {
	ctx    context.Context
	events chan ctapdiscover.Event
}

func newFakeDiscoveryMonitor() *fakeDiscoveryMonitor {
	return &fakeDiscoveryMonitor{
		events: make(chan ctapdiscover.Event, 8),
	}
}

func (m *fakeDiscoveryMonitor) open(ctx context.Context) <-chan ctapdiscover.Event {
	m.ctx = ctx

	return m.events
}

func (m *fakeDiscoveryMonitor) isCanceled() bool {
	return m.ctx != nil && m.ctx.Err() != nil
}

type fakeAuthenticatorRuntime struct {
	closed   atomic.Bool
	closeErr error
}

func (s *fakeAuthenticatorRuntime) Close() error {
	s.closed.Store(true)
	return s.closeErr
}

func (s *fakeAuthenticatorRuntime) Closed() bool { return s.closed.Load() }
