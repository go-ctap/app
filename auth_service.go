package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/config"
	"github.com/go-ctap/kit/model/largeblobs"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/model/webauthn"
	"github.com/go-ctap/kit/transport"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	eventOperationProgress    = "authenticator:operation-progress"
	eventInteractionRequested = "authenticator:interaction-requested"
	eventInteractionResolved  = "authenticator:interaction-resolved"
	eventSessionChanged       = "authenticator:session-changed"
)

var operationSequence uint64

type AuthenticatorService struct {
	mu               sync.Mutex
	appCtx           context.Context
	devices          []ctapkit.Device
	selectedSelector string
	active           map[string]context.CancelFunc
	interactions     map[string]chan InteractionAnswer
	selectedSession  *selectedSession
	discoverDevices  discoverDevicesFunc
	selectDevice     selectDeviceFunc
	openSession      openSessionFunc
}

func NewAuthenticatorService() *AuthenticatorService {
	return &AuthenticatorService{
		appCtx:          context.Background(),
		active:          make(map[string]context.CancelFunc),
		interactions:    make(map[string]chan InteractionAnswer),
		discoverDevices: ctapkit.DiscoverDevices,
		selectDevice:    ctapkit.SelectDevice,
		openSession: func(ctx context.Context, device ctapkit.Device, opts ...ctapkit.OpenSessionOption) (sessionHandle, error) {
			return ctapkit.OpenSession(ctx, device, opts...)
		},
	}
}

func (s *AuthenticatorService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	s.mu.Lock()
	s.appCtx = normalizeContext(ctx)
	s.mu.Unlock()
	return nil
}

func (s *AuthenticatorService) ServiceShutdown() error {
	var cancels []context.CancelFunc
	var canceledInteractions []chan InteractionAnswer

	s.mu.Lock()
	cancels, canceledInteractions = s.cancelActiveLocked()
	detached := s.detachSelectedSessionLocked(sessionStateClosed, "")
	s.mu.Unlock()

	resolveCanceled(canceledInteractions)
	cancelAll(cancels)
	closeDetachedSession(detached)
	return nil
}

type sessionLifecycleState string

const (
	sessionStateIdle    sessionLifecycleState = "idle"
	sessionStateOpening sessionLifecycleState = "opening"
	sessionStateReady   sessionLifecycleState = "ready"
	sessionStateRunning sessionLifecycleState = "running"
	sessionStateStale   sessionLifecycleState = "stale"
	sessionStateClosed  sessionLifecycleState = "closed"
	sessionStateError   sessionLifecycleState = "error"
)

type sessionHandle interface {
	Run(context.Context, model.Operation, model.InteractionHandler, ...ctapkit.RunOption) (model.OperationResult, error)
	Close() error
}

type discoverDevicesFunc func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error)
type selectDeviceFunc func([]ctapkit.Device, string) (ctapkit.Device, error)
type openSessionFunc func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error)

type selectedSession struct {
	selector          string
	deviceID          string
	devicePath        string
	device            report.DeviceReport
	session           sessionHandle
	state             sessionLifecycleState
	activeOperationID string
	lastError         *OperationError
	openedAt          time.Time
	updatedAt         time.Time
}

type SessionStatus struct {
	SelectedSelector string                `json:"selectedSelector,omitempty"`
	SelectedDevice   *report.DeviceReport  `json:"selectedDevice,omitempty"`
	State            sessionLifecycleState `json:"state"`
	ActiveOperation  string                `json:"activeOperation,omitempty"`
	Error            *OperationError       `json:"error,omitempty"`
	OpenedAt         string                `json:"openedAt,omitempty"`
	UpdatedAt        string                `json:"updatedAt,omitempty"`
}

type DiscoverRequest struct {
	Transport string `json:"transport,omitempty"`
}

type DiscoveryResponse struct {
	Devices          []report.DeviceReport `json:"devices"`
	SelectedSelector string                `json:"selectedSelector,omitempty"`
	SelectedDevice   *report.DeviceReport  `json:"selectedDevice,omitempty"`
	Session          SessionStatus         `json:"session"`
	Error            *OperationError       `json:"error,omitempty"`
}

type OperationRequest struct {
	Selector         string                 `json:"selector,omitempty"`
	VerificationFlow model.VerificationFlow `json:"verificationFlow,omitempty"`
}

type OperationEnvelope struct {
	OperationID    string               `json:"operationId"`
	SelectedDevice *report.DeviceReport `json:"selectedDevice,omitempty"`
	Session        SessionStatus        `json:"session"`
	Result         any                  `json:"result,omitempty"`
	Error          *OperationError      `json:"error,omitempty"`
}

type OperationError struct {
	Category model.ErrorCategory `json:"category,omitempty"`
	Message  string              `json:"message"`
	Hint     string              `json:"hint,omitempty"`
}

type OperationEventEnvelope struct {
	OperationID string               `json:"operationId"`
	Event       model.OperationEvent `json:"event"`
}

type InteractionPrompt struct {
	OperationID   string                   `json:"operationId"`
	InteractionID string                   `json:"interactionId"`
	Request       model.InteractionRequest `json:"request"`
}

type InteractionAnswer struct {
	InteractionID string `json:"interactionId"`
	PIN           string `json:"pin,omitempty"`
	Confirmed     bool   `json:"confirmed,omitempty"`
	Canceled      bool   `json:"canceled,omitempty"`
}

type CredentialDeleteRequest struct {
	Selector            string `json:"selector,omitempty"`
	CredentialIDHex     string `json:"credentialIdHex"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type CredentialUpdateRequest struct {
	Selector            string `json:"selector,omitempty"`
	CredentialIDHex     string `json:"credentialIdHex"`
	UserIDHex           string `json:"userIdHex,omitempty"`
	Name                string `json:"name,omitempty"`
	DisplayName         string `json:"displayName,omitempty"`
	UserIDProvided      bool   `json:"userIdProvided,omitempty"`
	NameProvided        bool   `json:"nameProvided,omitempty"`
	DisplayProvided     bool   `json:"displayProvided,omitempty"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type LargeBlobReadRequest struct {
	Selector        string                `json:"selector,omitempty"`
	CredentialIDHex string                `json:"credentialIdHex"`
	DecodeMode      largeblobs.DecodeMode `json:"decodeMode,omitempty"`
}

type LargeBlobMutationRequest struct {
	Selector            string `json:"selector,omitempty"`
	CredentialIDHex     string `json:"credentialIdHex"`
	Payload             []byte `json:"payload,omitempty"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type PINRequest struct {
	Selector            string `json:"selector,omitempty"`
	CurrentPIN          string `json:"currentPin,omitempty"`
	NewPIN              string `json:"newPin"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type AlwaysUVRequest struct {
	Selector            string                `json:"selector,omitempty"`
	Target              config.AlwaysUVTarget `json:"target"`
	Confirmed           bool                  `json:"confirmed,omitempty"`
	ConfirmationMessage string                `json:"confirmationMessage,omitempty"`
	DryRun              bool                  `json:"dryRun,omitempty"`
}

type MinPINLengthRequest struct {
	Selector            string   `json:"selector,omitempty"`
	Length              uint     `json:"newMinPINLength"`
	RPIDs               []string `json:"minPinLengthRPIDs,omitempty"`
	ForceChangePin      bool     `json:"forceChangePin,omitempty"`
	PinComplexityPolicy bool     `json:"pinComplexityPolicy,omitempty"`
	Confirmed           bool     `json:"confirmed,omitempty"`
	ConfirmationMessage string   `json:"confirmationMessage,omitempty"`
	DryRun              bool     `json:"dryRun,omitempty"`
}

type BioEnrollRequest struct {
	Selector            string `json:"selector,omitempty"`
	TimeoutMilliseconds uint   `json:"timeoutMilliseconds,omitempty"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type BioMutationRequest struct {
	Selector            string `json:"selector,omitempty"`
	TemplateIDHex       string `json:"templateIdHex"`
	FriendlyName        string `json:"friendlyName,omitempty"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type ResetRequest struct {
	Selector            string `json:"selector,omitempty"`
	Confirmed           bool   `json:"confirmed,omitempty"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	DryRun              bool   `json:"dryRun,omitempty"`
}

type MakeCredentialRequest struct {
	Selector            string                       `json:"selector,omitempty"`
	Input               webauthn.MakeCredentialInput `json:"input"`
	Confirmed           bool                         `json:"confirmed,omitempty"`
	ConfirmationMessage string                       `json:"confirmationMessage,omitempty"`
	DryRun              bool                         `json:"dryRun,omitempty"`
}

type GetAssertionRequest struct {
	Selector string                     `json:"selector,omitempty"`
	Input    webauthn.GetAssertionInput `json:"input"`
}

func (s *AuthenticatorService) Discover(ctx context.Context, req DiscoverRequest) DiscoveryResponse {
	ctx = normalizeContext(ctx)
	devices, err := s.discoverDevices(ctx, discoverOptions(req.Transport)...)
	if err != nil {
		return DiscoveryResponse{Error: operationError(err), Session: s.statusSnapshot()}
	}

	reports := make([]report.DeviceReport, 0, len(devices))
	for _, device := range devices {
		reports = append(reports, device.Report())
	}

	s.mu.Lock()
	previous := s.selectedSelector
	s.devices = devices
	s.selectedSelector = reconcileDiscoverySelectionLocked(s.selectedSelector, reports)
	selected := selectedReport(reports, s.selectedSelector)
	var detached sessionHandle
	if s.selectedSession != nil && !selectedSessionMatchesReports(s.selectedSession, reports) {
		state := sessionStateStale
		message := "Selected authenticator disappeared. Refresh or reconnect it."
		if previous == "" || selected != nil {
			state = sessionStateClosed
			message = ""
		}
		detached = s.detachSelectedSessionLocked(state, message)
		if previous != "" && selected == nil {
			s.selectedSelector = ""
		}
	}
	if selected != nil && s.selectedSession == nil {
		s.selectedSession = newClosedSelectedSessionLocked(*selected)
	}
	status := s.statusSnapshotLocked(selected)
	selectedSelector := s.selectedSelector
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()

	return DiscoveryResponse{
		Devices:          reports,
		SelectedSelector: selectedSelector,
		SelectedDevice:   selected,
		Session:          status,
	}
}

func (s *AuthenticatorService) Select(ctx context.Context, selector string) DiscoveryResponse {
	ctx = normalizeContext(ctx)
	selector = strings.TrimSpace(selector)

	s.mu.Lock()

	reports := deviceReports(s.devices)
	if selector == "" {
		cancels, canceledInteractions := s.cancelActiveLocked()
		detached := s.detachSelectedSessionLocked(sessionStateClosed, "")
		s.selectedSelector = ""
		status := s.statusSnapshotLocked(nil)
		s.mu.Unlock()
		resolveCanceled(canceledInteractions)
		cancelAll(cancels)
		closeDetachedSession(detached)
		s.emitSessionStatus()
		return DiscoveryResponse{
			Devices:          reports,
			SelectedSelector: "",
			SelectedDevice:   nil,
			Session:          status,
		}
	}

	device, err := s.selectDevice(s.devices, selector)
	if err != nil {
		selected := selectedReport(reports, s.selectedSelector)
		status := s.statusSnapshotLocked(selected)
		selectedSelector := s.selectedSelector
		s.mu.Unlock()
		return DiscoveryResponse{
			Devices:          reports,
			SelectedSelector: selectedSelector,
			SelectedDevice:   selected,
			Session:          status,
			Error:            operationError(err),
		}
	}
	selected := device.Report()
	cancels, canceledInteractions := s.cancelActiveLocked()
	detached := s.detachSelectedSessionLocked(sessionStateClosed, "")
	s.selectedSelector = selected.DeviceID
	s.selectedSession = newClosedSelectedSessionLocked(selected)
	status := s.statusSnapshotLocked(&selected)
	s.mu.Unlock()

	resolveCanceled(canceledInteractions)
	cancelAll(cancels)
	closeDetachedSession(detached)
	s.emitSessionStatus()

	return DiscoveryResponse{
		Devices:          reports,
		SelectedSelector: selected.DeviceID,
		SelectedDevice:   &selected,
		Session:          status,
	}
}

func (s *AuthenticatorService) SessionStatus(ctx context.Context) SessionStatus {
	return s.statusSnapshot()
}

func (s *AuthenticatorService) LockSession(ctx context.Context) SessionStatus {
	var cancel context.CancelFunc

	s.mu.Lock()
	if s.selectedSession != nil && s.selectedSession.activeOperationID != "" {
		cancel = s.active[s.selectedSession.activeOperationID]
	}
	detached := s.detachSelectedSessionLocked(sessionStateClosed, "")
	status := s.statusSnapshotLocked(selectedReport(deviceReports(s.devices), s.selectedSelector))
	s.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	closeDetachedSession(detached)
	s.emitSessionStatus()
	return status
}

func (s *AuthenticatorService) CancelOperation(ctx context.Context, operationID string) bool {
	s.mu.Lock()
	cancel, ok := s.active[operationID]
	canceledInteractions := s.cancelInteractionsLocked(operationID)
	s.mu.Unlock()
	if ok {
		cancel()
	}
	resolveCanceled(canceledInteractions)
	return ok || len(canceledInteractions) > 0
}

func (s *AuthenticatorService) ResolveInteraction(ctx context.Context, answer InteractionAnswer) bool {
	s.mu.Lock()
	ch, ok := s.interactions[answer.InteractionID]
	if ok {
		delete(s.interactions, answer.InteractionID)
	}
	s.mu.Unlock()
	if !ok {
		return false
	}

	select {
	case ch <- answer:
	default:
	}
	emit(eventInteractionResolved, answer)
	return true
}

func (s *AuthenticatorService) Inspect(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.InspectOperation{})
}

func (s *AuthenticatorService) ListCredentials(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.ListCredentialsOperation{})
}

func (s *AuthenticatorService) DeleteCredential(ctx context.Context, req CredentialDeleteRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.DeleteCredentialOperation{
		CredentialIDHex:     req.CredentialIDHex,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) UpdateCredentialUser(ctx context.Context, req CredentialUpdateRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.UpdateCredentialUserOperation{
		CredentialIDHex:     req.CredentialIDHex,
		UserIDHex:           req.UserIDHex,
		Name:                req.Name,
		DisplayName:         req.DisplayName,
		UserIDProvided:      req.UserIDProvided,
		NameProvided:        req.NameProvided,
		DisplayProvided:     req.DisplayProvided,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) ListLargeBlobs(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.ListLargeBlobsOperation{})
}

func (s *AuthenticatorService) ReadLargeBlob(ctx context.Context, req LargeBlobReadRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.ReadLargeBlobOperation{
		CredentialIDHex: req.CredentialIDHex,
		DecodeMode:      req.DecodeMode,
	})
}

func (s *AuthenticatorService) WriteLargeBlob(ctx context.Context, req LargeBlobMutationRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.WriteLargeBlobOperation{
		CredentialIDHex:     req.CredentialIDHex,
		Payload:             req.Payload,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) DeleteLargeBlob(ctx context.Context, req LargeBlobMutationRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.DeleteLargeBlobOperation{
		CredentialIDHex:     req.CredentialIDHex,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) ConfigStatus(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.ConfigStatusOperation{})
}

func (s *AuthenticatorService) SetPIN(ctx context.Context, req PINRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.SetPINOperation{
		NewPIN:              req.NewPIN,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) ChangePIN(ctx context.Context, req PINRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.ChangePINOperation{
		CurrentPIN:          req.CurrentPIN,
		NewPIN:              req.NewPIN,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) SetAlwaysUV(ctx context.Context, req AlwaysUVRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.SetAlwaysUVOperation{
		Target:              req.Target,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) SetMinPINLength(ctx context.Context, req MinPINLengthRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.SetMinPINLengthOperation{
		Length:              req.Length,
		RPIDs:               req.RPIDs,
		ForceChangePin:      req.ForceChangePin,
		PinComplexityPolicy: req.PinComplexityPolicy,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) BioSensorInfo(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.BioSensorInfoOperation{})
}

func (s *AuthenticatorService) BioList(ctx context.Context, req OperationRequest) OperationEnvelope {
	return s.run(ctx, req, model.BioListOperation{})
}

func (s *AuthenticatorService) BioEnroll(ctx context.Context, req BioEnrollRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.BioEnrollOperation{
		TimeoutMilliseconds: req.TimeoutMilliseconds,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) BioRename(ctx context.Context, req BioMutationRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.BioRenameOperation{
		TemplateIDHex:       req.TemplateIDHex,
		FriendlyName:        req.FriendlyName,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) BioRemove(ctx context.Context, req BioMutationRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.BioRemoveOperation{
		TemplateIDHex:       req.TemplateIDHex,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) ResetFactory(ctx context.Context, req ResetRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.ResetFactoryOperation{
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) MakeCredential(ctx context.Context, req MakeCredentialRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.MakeCredentialOperation{
		MakeCredentialInput: req.Input,
		Confirmed:           req.Confirmed,
		ConfirmationMessage: req.ConfirmationMessage,
		DryRun:              req.DryRun,
	})
}

func (s *AuthenticatorService) GetAssertion(ctx context.Context, req GetAssertionRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.GetAssertionOperation{
		GetAssertionInput: req.Input,
	})
}

func (s *AuthenticatorService) run(ctx context.Context, req OperationRequest, operation model.Operation) OperationEnvelope {
	operationID := nextOperationID()
	sessionCtx := s.serviceContext()
	runCtx, cancel := context.WithCancel(sessionCtx)
	defer cancel()

	session, selected, started, err := s.ensureOperationSession(sessionCtx, req, operationID, cancel)
	if err != nil {
		opErr := operationError(err)
		if started {
			s.finishOperation(operationID)
			s.failSessionOpen(operationID, opErr, selected)
		}
		return OperationEnvelope{OperationID: operationID, SelectedDevice: selected, Session: s.statusSnapshot(), Error: opErr}
	}

	runOptions := []ctapkit.RunOption{}
	if req.VerificationFlow != "" {
		runOptions = append(runOptions, ctapkit.WithVerificationFlow(req.VerificationFlow))
	}
	result, err := session.Run(runCtx, operation, s.interactionHandler(operationID), runOptions...)
	if err != nil {
		opErr := operationError(err)
		s.finishOperation(operationID)
		s.invalidateSessionAfterError(operationID, session, opErr)
		return OperationEnvelope{OperationID: operationID, SelectedDevice: selected, Session: s.statusSnapshot(), Error: opErr}
	}

	s.finishOperation(operationID)
	if operation.Kind() == model.OperationResetFactory && !operation.IsDryRun() {
		s.markSessionStale(session, "Factory reset completed. Refresh discovery before running more operations.")
	}

	return OperationEnvelope{OperationID: operationID, SelectedDevice: selected, Session: s.statusSnapshot(), Result: result}
}

func (s *AuthenticatorService) ensureOperationSession(
	ctx context.Context,
	req OperationRequest,
	operationID string,
	cancel context.CancelFunc,
) (sessionHandle, *report.DeviceReport, bool, error) {
	requested := strings.TrimSpace(req.Selector)

	var detached sessionHandle
	s.mu.Lock()
	if s.selectedSession != nil && s.selectedSession.activeOperationID != "" {
		s.mu.Unlock()
		return nil, nil, false, model.NewRuntimeError(model.ErrorBusy, "selected authenticator is already running an operation", nil)
	}
	if strings.TrimSpace(requested) != "" {
		if requested != s.selectedSelector {
			detached = s.detachSelectedSessionLocked(sessionStateClosed, "")
		}
		s.selectedSelector = requested
	}
	if s.selectedSession != nil && s.selectedSession.session != nil && s.selectedSession.selector == s.selectedSelector && s.selectedSession.state != sessionStateStale && s.selectedSession.state != sessionStateError {
		s.selectedSession.state = sessionStateRunning
		s.selectedSession.activeOperationID = operationID
		s.selectedSession.updatedAt = time.Now()
		s.active[operationID] = cancel
		selected := s.selectedSession.device
		session := s.selectedSession.session
		s.mu.Unlock()
		closeDetachedSession(detached)
		s.emitSessionStatus()
		return session, &selected, true, nil
	}
	s.active[operationID] = cancel
	if s.selectedSession == nil {
		s.selectedSession = &selectedSession{selector: s.selectedSelector}
	}
	s.selectedSession.state = sessionStateOpening
	s.selectedSession.activeOperationID = operationID
	s.selectedSession.lastError = nil
	s.selectedSession.updatedAt = time.Now()
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()

	devices, err := s.discoverDevices(ctx)
	if err != nil {
		return nil, nil, true, err
	}
	reports := deviceReports(devices)

	s.mu.Lock()
	s.devices = devices
	if requested == "" {
		s.selectedSelector = reconcileSelectionLocked(s.selectedSelector, reports)
	}
	selector := s.selectedSelector
	s.mu.Unlock()

	device, err := s.selectDevice(devices, selector)
	if err != nil {
		return nil, nil, true, err
	}
	selected := device.Report()
	session, err := s.openSession(ctx, device, ctapkit.WithEventSink(operationEventSink{service: s}))
	if err != nil {
		return nil, &selected, true, err
	}

	s.mu.Lock()
	s.selectedSession = &selectedSession{
		selector:          selector,
		deviceID:          selected.DeviceID,
		devicePath:        selected.Path,
		device:            selected,
		session:           session,
		state:             sessionStateRunning,
		activeOperationID: operationID,
		openedAt:          time.Now(),
		updatedAt:         time.Now(),
	}
	s.mu.Unlock()
	s.emitSessionStatus()

	return session, &selected, true, nil
}

func (s *AuthenticatorService) finishOperation(operationID string) {
	s.mu.Lock()
	delete(s.active, operationID)
	if s.selectedSession != nil && s.selectedSession.activeOperationID == operationID {
		s.selectedSession.activeOperationID = ""
		if s.selectedSession.session != nil && s.selectedSession.state == sessionStateRunning {
			s.selectedSession.state = sessionStateReady
		}
		s.selectedSession.updatedAt = time.Now()
	}
	s.mu.Unlock()
	s.emitSessionStatus()
}

func (s *AuthenticatorService) cancelActiveLocked() ([]context.CancelFunc, []chan InteractionAnswer) {
	cancels := make([]context.CancelFunc, 0, len(s.active))
	canceledInteractions := make([]chan InteractionAnswer, 0)
	for operationID, cancel := range s.active {
		cancels = append(cancels, cancel)
		canceledInteractions = append(canceledInteractions, s.cancelInteractionsLocked(operationID)...)
		delete(s.active, operationID)
	}
	return cancels, canceledInteractions
}

func (s *AuthenticatorService) cancelInteractionsLocked(operationID string) []chan InteractionAnswer {
	canceledInteractions := make([]chan InteractionAnswer, 0)
	for interactionID, ch := range s.interactions {
		if strings.HasPrefix(interactionID, operationID+":") {
			canceledInteractions = append(canceledInteractions, ch)
			delete(s.interactions, interactionID)
		}
	}
	return canceledInteractions
}

func cancelAll(cancels []context.CancelFunc) {
	for _, cancel := range cancels {
		if cancel != nil {
			cancel()
		}
	}
}

func resolveCanceled(channels []chan InteractionAnswer) {
	for _, ch := range channels {
		select {
		case ch <- InteractionAnswer{Canceled: true}:
		default:
		}
	}
}

func (s *AuthenticatorService) interactionHandler(operationID string) model.InteractionHandler {
	return interactionHandlerFunc(func(request model.InteractionRequest) (model.InteractionResponse, error) {
		interactionID := operationID + ":" + nextOperationID()
		ch := make(chan InteractionAnswer, 1)

		s.mu.Lock()
		s.interactions[interactionID] = ch
		s.mu.Unlock()
		defer func() {
			s.mu.Lock()
			delete(s.interactions, interactionID)
			s.mu.Unlock()
		}()

		emit(eventInteractionRequested, InteractionPrompt{
			OperationID:   operationID,
			InteractionID: interactionID,
			Request:       request,
		})

		select {
		case answer := <-ch:
			if answer.Canceled {
				return model.InteractionResponse{Canceled: true}, nil
			}
			return model.InteractionResponse{
				PIN:       []byte(answer.PIN),
				Confirmed: answer.Confirmed,
			}, nil
		case <-time.After(10 * time.Minute):
			return model.InteractionResponse{Canceled: true}, nil
		}
	})
}

type interactionHandlerFunc func(model.InteractionRequest) (model.InteractionResponse, error)

func (f interactionHandlerFunc) RequestInteraction(request model.InteractionRequest) (model.InteractionResponse, error) {
	return f(request)
}

type operationEventSink struct {
	service *AuthenticatorService
}

func (s operationEventSink) Emit(event model.OperationEvent) {
	if event.Stage == model.OperationStageSessionInvalidated {
		return
	}
	operationID := ""
	if s.service != nil {
		operationID = s.service.currentOperationID()
	}
	emit(eventOperationProgress, OperationEventEnvelope{
		OperationID: operationID,
		Event:       event,
	})
}

func (s *AuthenticatorService) currentOperationID() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.selectedSession == nil {
		return ""
	}
	return s.selectedSession.activeOperationID
}

func (s *AuthenticatorService) invalidateSessionAfterError(operationID string, failedSession sessionHandle, err *OperationError) {
	if err == nil {
		return
	}
	switch err.Category {
	case model.ErrorInvalidSession, model.ErrorInvalidState, model.ErrorTransportFailure:
	default:
		return
	}

	s.mu.Lock()
	var detached sessionHandle
	if s.selectedSession != nil && (s.selectedSession.session == failedSession || s.selectedSession.activeOperationID == operationID) {
		detached = s.detachSelectedSessionLocked(sessionStateStale, err.Message)
		s.selectedSession.lastError = err
	}
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()
}

func (s *AuthenticatorService) failSessionOpen(operationID string, err *OperationError, selected *report.DeviceReport) {
	if err == nil {
		return
	}

	s.mu.Lock()
	if s.selectedSession == nil {
		s.selectedSession = &selectedSession{selector: s.selectedSelector}
	}
	if selected != nil {
		s.selectedSession.device = *selected
		s.selectedSession.deviceID = selected.DeviceID
		s.selectedSession.devicePath = selected.Path
	}
	s.selectedSession.activeOperationID = ""
	s.selectedSession.state = sessionStateError
	s.selectedSession.lastError = err
	s.selectedSession.updatedAt = time.Now()
	detached := s.detachSelectedSessionLocked(sessionStateError, "")
	s.selectedSession.lastError = err
	_ = operationID
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()
}

func (s *AuthenticatorService) markSessionStale(session sessionHandle, message string) {
	s.mu.Lock()
	var detached sessionHandle
	if s.selectedSession != nil && s.selectedSession.session == session {
		detached = s.detachSelectedSessionLocked(sessionStateStale, message)
	}
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()
}

func (s *AuthenticatorService) detachSelectedSessionLocked(state sessionLifecycleState, message string) sessionHandle {
	if s.selectedSession == nil {
		s.selectedSession = &selectedSession{
			selector:  s.selectedSelector,
			state:     state,
			updatedAt: time.Now(),
		}
		if message != "" {
			s.selectedSession.lastError = &OperationError{Category: model.ErrorInvalidSession, Message: message}
		}
		return nil
	}
	detached := s.selectedSession.session
	s.selectedSession.session = nil
	s.selectedSession.activeOperationID = ""
	s.selectedSession.state = state
	s.selectedSession.updatedAt = time.Now()
	if message != "" {
		s.selectedSession.lastError = &OperationError{Category: model.ErrorInvalidSession, Message: message}
	} else {
		s.selectedSession.lastError = nil
	}
	return detached
}

func closeDetachedSession(session sessionHandle) {
	if session != nil {
		_ = session.Close()
	}
}

func newClosedSelectedSessionLocked(selected report.DeviceReport) *selectedSession {
	return &selectedSession{
		selector:   selected.DeviceID,
		deviceID:   selected.DeviceID,
		devicePath: selected.Path,
		device:     selected,
		state:      sessionStateClosed,
		updatedAt:  time.Now(),
	}
}

func (s *AuthenticatorService) serviceContext() context.Context {
	s.mu.Lock()
	defer s.mu.Unlock()
	return normalizeContext(s.appCtx)
}

func (s *AuthenticatorService) statusSnapshot() SessionStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.statusSnapshotLocked(selectedReport(deviceReports(s.devices), s.selectedSelector))
}

func (s *AuthenticatorService) statusSnapshotLocked(selected *report.DeviceReport) SessionStatus {
	status := SessionStatus{
		SelectedSelector: s.selectedSelector,
		SelectedDevice:   selected,
		State:            sessionStateIdle,
	}
	if s.selectedSession == nil {
		if s.selectedSelector != "" {
			status.State = sessionStateClosed
		}
		return status
	}
	if selected == nil && s.selectedSession.deviceID != "" {
		selectedDevice := s.selectedSession.device
		status.SelectedDevice = &selectedDevice
	}
	status.State = s.selectedSession.state
	status.ActiveOperation = s.selectedSession.activeOperationID
	status.Error = s.selectedSession.lastError
	if !s.selectedSession.openedAt.IsZero() {
		status.OpenedAt = s.selectedSession.openedAt.Format(time.RFC3339)
	}
	if !s.selectedSession.updatedAt.IsZero() {
		status.UpdatedAt = s.selectedSession.updatedAt.Format(time.RFC3339)
	}
	return status
}

func (s *AuthenticatorService) emitSessionStatus() {
	emit(eventSessionChanged, s.statusSnapshot())
}

func discoverOptions(mode string) []ctapkit.DiscoverOption {
	switch transport.Mode(strings.TrimSpace(mode)) {
	case transport.ModeHID:
		return []ctapkit.DiscoverOption{ctapkit.WithTransport(transport.ModeHID)}
	case transport.ModeWindowsProxy:
		return []ctapkit.DiscoverOption{ctapkit.WithTransport(transport.ModeWindowsProxy)}
	default:
		return nil
	}
}

func deviceReports(devices []ctapkit.Device) []report.DeviceReport {
	reports := make([]report.DeviceReport, 0, len(devices))
	for _, device := range devices {
		reports = append(reports, device.Report())
	}
	return reports
}

func selectedSessionMatchesReports(session *selectedSession, reports []report.DeviceReport) bool {
	if session == nil || session.selector == "" {
		return true
	}
	for _, report := range reports {
		if session.deviceID != "" && session.devicePath != "" && report.DeviceID == session.deviceID && report.Path == session.devicePath {
			return true
		}
	}
	return false
}

func reconcileDiscoverySelectionLocked(current string, reports []report.DeviceReport) string {
	current = strings.TrimSpace(current)
	if current != "" && selectedReport(reports, current) != nil {
		return current
	}
	if current != "" {
		return ""
	}
	return reconcileSelectionLocked(current, reports)
}

func reconcileSelectionLocked(current string, reports []report.DeviceReport) string {
	current = strings.TrimSpace(current)
	if current != "" && selectedReport(reports, current) != nil {
		return current
	}
	if len(reports) == 1 {
		return reports[0].DeviceID
	}
	return ""
}

func selectedReport(reports []report.DeviceReport, selector string) *report.DeviceReport {
	selector = strings.TrimSpace(selector)
	if selector == "" {
		return nil
	}
	for _, report := range reports {
		if report.DeviceID == selector || report.OrdinalAlias == selector {
			selected := report
			return &selected
		}
	}
	return nil
}

func operationError(err error) *OperationError {
	if err == nil {
		return nil
	}

	var runtimeErr model.RuntimeError
	if errors.As(err, &runtimeErr) {
		return &OperationError{
			Category: runtimeErr.Category,
			Message:  runtimeErr.Error(),
			Hint:     hintFor(runtimeErr.Category),
		}
	}

	return &OperationError{
		Message: err.Error(),
	}
}

func hintFor(category model.ErrorCategory) string {
	switch category {
	case model.ErrorPermissionDenied:
		return "Close other apps using the authenticator or run with access to HID devices."
	case model.ErrorTransportFailure:
		return "Check the Windows CTAP HID proxy or reconnect the authenticator."
	case model.ErrorBusy:
		return "Another operation is using this authenticator. Wait for it to finish, then retry."
	case model.ErrorInvalidState:
		return "Refresh the token list and make sure the authenticator is still connected."
	case model.ErrorInvalidSession:
		return "Reconnect or refresh the selected authenticator, then run the operation again."
	case model.ErrorCanceled:
		return "The operation was canceled before the authenticator completed it."
	default:
		return ""
	}
}

func nextOperationID() string {
	return fmt.Sprintf("op-%d", atomic.AddUint64(&operationSequence, 1))
}

func emit(name string, data any) {
	app := application.Get()
	if app == nil {
		return
	}
	app.Event.Emit(name, data)
}

func normalizeContext(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}
	return ctx
}
