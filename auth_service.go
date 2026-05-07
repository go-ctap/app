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
	selectedDevice   *report.DeviceReport
	session          sessionHandle
	activeOperation  string
	activeCancel     context.CancelFunc
	interactions     map[string]chan InteractionAnswer
	sessionState     sessionLifecycleState
	sessionError     *OperationError
	sessionOpenedAt  time.Time
	sessionUpdatedAt time.Time
	discoverDevices  discoverDevicesFunc
	selectDevice     selectDeviceFunc
	openSession      openSessionFunc
}

func NewAuthenticatorService() *AuthenticatorService {
	return &AuthenticatorService{
		appCtx:          context.Background(),
		interactions:    make(map[string]chan InteractionAnswer),
		sessionState:    sessionStateIdle,
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
	s.mu.Lock()
	cancel, canceledInteractions, detached := s.closeSessionLocked(sessionStateClosed, "")
	s.mu.Unlock()

	resolveCanceled(canceledInteractions)
	if cancel != nil {
		cancel()
	}
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
	Info() model.SessionInfo
}

type discoverDevicesFunc func(context.Context, ...ctapkit.DiscoverOption) ([]ctapkit.Device, error)
type selectDeviceFunc func([]ctapkit.Device, string) (ctapkit.Device, error)
type openSessionFunc func(context.Context, ctapkit.Device, ...ctapkit.OpenSessionOption) (sessionHandle, error)

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

type LargeBlobGarbageCollectRequest struct {
	Selector            string `json:"selector,omitempty"`
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
	s.selectedDevice = cloneReport(selected)
	var cancel context.CancelFunc
	var canceledInteractions []chan InteractionAnswer
	var detached sessionHandle
	if previous != s.selectedSelector || (s.session != nil && !sameSelectedDevice(s.selectedDevice, selected)) {
		state := sessionStateClosed
		if s.selectedSelector == "" {
			state = sessionStateIdle
		}
		cancel, canceledInteractions, detached = s.closeSessionLocked(state, "")
	}
	status := s.statusSnapshotLocked(selected)
	selectedSelector := s.selectedSelector
	s.mu.Unlock()
	resolveCanceled(canceledInteractions)
	if cancel != nil {
		cancel()
	}
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
		cancel, canceledInteractions, detached := s.closeSessionLocked(sessionStateIdle, "")
		s.selectedSelector = ""
		s.selectedDevice = nil
		status := s.statusSnapshotLocked(nil)
		s.mu.Unlock()
		resolveCanceled(canceledInteractions)
		if cancel != nil {
			cancel()
		}
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
	if selected.DeviceID == "" {
		selected.DeviceID = selector
	}
	cancel, canceledInteractions, detached := s.closeSessionLocked(sessionStateClosed, "")
	s.selectedSelector = selected.DeviceID
	s.selectedDevice = &selected
	status := s.statusSnapshotLocked(&selected)
	s.mu.Unlock()

	resolveCanceled(canceledInteractions)
	if cancel != nil {
		cancel()
	}
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
	s.mu.Lock()
	cancel, canceledInteractions, detached := s.closeSessionLocked(sessionStateClosed, "")
	status := s.statusSnapshotLocked(selectedReport(deviceReports(s.devices), s.selectedSelector))
	s.mu.Unlock()

	resolveCanceled(canceledInteractions)
	if cancel != nil {
		cancel()
	}
	closeDetachedSession(detached)
	s.emitSessionStatus()
	return status
}

func (s *AuthenticatorService) OpenSession(ctx context.Context, req OperationRequest) SessionStatus {
	operationID := nextOperationID()
	sessionCtx := s.serviceContext()
	_, cancel := context.WithCancel(sessionCtx)
	defer cancel()

	session, selected, err := s.ensureOperationSession(sessionCtx, req, operationID, cancel)
	if err != nil {
		opErr := operationError(err)
		s.failOperationStart(operationID, opErr, selected)
		return s.statusSnapshot()
	}

	if session == nil {
		opErr := operationError(model.NewRuntimeError(model.ErrorInvalidSession, "session did not open", nil))
		s.failOperationStart(operationID, opErr, selected)
		return s.statusSnapshot()
	}

	s.finishOperation(operationID)
	return s.statusSnapshot()
}

func (s *AuthenticatorService) CancelOperation(ctx context.Context, operationID string) bool {
	s.mu.Lock()
	cancel := s.activeCancel
	ok := s.activeOperation == operationID && cancel != nil
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

func (s *AuthenticatorService) GarbageCollectLargeBlobs(ctx context.Context, req LargeBlobGarbageCollectRequest) OperationEnvelope {
	return s.run(ctx, OperationRequest{Selector: req.Selector}, model.GarbageCollectLargeBlobsOperation{
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

	session, selected, err := s.ensureOperationSession(sessionCtx, req, operationID, cancel)
	if err != nil {
		opErr := operationError(err)
		s.failOperationStart(operationID, opErr, selected)
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
		s.closeSessionAfterRuntimeError(operationID, session, opErr)
		return OperationEnvelope{OperationID: operationID, SelectedDevice: selected, Session: s.statusSnapshot(), Result: result, Error: opErr}
	}

	s.finishOperation(operationID)
	if operation.Kind() == model.OperationResetFactory && !operation.IsDryRun() {
		s.closeSessionAfterReset(session)
	}

	return OperationEnvelope{OperationID: operationID, SelectedDevice: selected, Session: s.statusSnapshot(), Result: result}
}

func (s *AuthenticatorService) ensureOperationSession(
	ctx context.Context,
	req OperationRequest,
	operationID string,
	cancel context.CancelFunc,
) (sessionHandle, *report.DeviceReport, error) {
	requested := strings.TrimSpace(req.Selector)

	var detached sessionHandle
	s.mu.Lock()
	if s.activeOperation != "" {
		s.mu.Unlock()
		return nil, nil, model.NewRuntimeError(model.ErrorBusy, "selected authenticator is already running an operation", nil)
	}
	if strings.TrimSpace(requested) != "" {
		if requested != s.selectedSelector {
			_, _, detached = s.closeSessionLocked(sessionStateClosed, "")
		}
		s.selectedSelector = requested
	}
	if s.session != nil {
		s.sessionState = sessionStateRunning
		s.activeOperation = operationID
		s.activeCancel = cancel
		s.sessionError = nil
		s.sessionUpdatedAt = time.Now()
		selected := cloneReport(s.selectedDevice)
		session := s.session
		s.mu.Unlock()
		closeDetachedSession(detached)
		s.emitSessionStatus()
		return session, selected, nil
	}
	s.activeOperation = operationID
	s.activeCancel = cancel
	s.sessionState = sessionStateOpening
	s.sessionError = nil
	s.sessionUpdatedAt = time.Now()
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()

	devices, err := s.discoverDevices(ctx)
	if err != nil {
		return nil, nil, err
	}
	reports := deviceReports(devices)

	s.mu.Lock()
	s.devices = devices
	if requested == "" {
		s.selectedSelector = reconcileSelectionLocked(s.selectedSelector, reports)
	}
	selector := s.selectedSelector
	selected := selectedReport(reports, selector)
	s.selectedDevice = cloneReport(selected)
	s.mu.Unlock()

	device, err := s.selectDevice(devices, selector)
	if err != nil {
		return nil, selected, err
	}
	selectedDevice := device.Report()
	if selectedDevice.DeviceID == "" {
		selectedDevice.DeviceID = selector
	}
	session, err := s.openSession(ctx, device, ctapkit.WithEventSink(operationEventSink{service: s}))
	if err != nil {
		return nil, &selectedDevice, err
	}

	s.mu.Lock()
	if s.activeOperation != operationID || s.selectedSelector != selector {
		s.mu.Unlock()
		closeDetachedSession(session)
		return nil, &selectedDevice, model.NewRuntimeError(model.ErrorCanceled, "operation was canceled before the session opened", nil)
	}
	s.selectedDevice = &selectedDevice
	s.session = session
	s.sessionState = sessionStateRunning
	s.sessionOpenedAt = time.Now()
	s.sessionUpdatedAt = s.sessionOpenedAt
	s.mu.Unlock()
	s.emitSessionStatus()

	return session, &selectedDevice, nil
}

func (s *AuthenticatorService) finishOperation(operationID string) {
	s.mu.Lock()
	if s.activeOperation == operationID {
		s.activeOperation = ""
		s.activeCancel = nil
		if s.session != nil && (s.sessionState == sessionStateRunning || s.sessionState == sessionStateOpening) {
			s.sessionState = sessionStateReady
		}
		s.sessionUpdatedAt = time.Now()
	}
	s.mu.Unlock()
	s.emitSessionStatus()
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
	return s.activeOperation
}

func (s *AuthenticatorService) closeSessionAfterRuntimeError(operationID string, failedSession sessionHandle, err *OperationError) {
	if err == nil {
		return
	}
	switch err.Category {
	case model.ErrorInvalidSession, model.ErrorInvalidState, model.ErrorTransportFailure:
	default:
		return
	}
	if err.Category == model.ErrorInvalidState && strings.Contains(err.Message, "large blob array capacity") {
		return
	}

	s.mu.Lock()
	var detached sessionHandle
	if s.session == failedSession || s.activeOperation == operationID {
		_, _, detached = s.closeSessionLocked(sessionStateStale, err.Message)
		s.sessionError = err
	}
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()
}

func (s *AuthenticatorService) failOperationStart(operationID string, err *OperationError, selected *report.DeviceReport) {
	if err == nil {
		return
	}

	s.mu.Lock()
	if s.activeOperation != operationID && selected == nil {
		s.mu.Unlock()
		return
	}
	if selected != nil {
		s.selectedDevice = cloneReport(selected)
	}
	if s.activeOperation == operationID {
		s.activeOperation = ""
		s.activeCancel = nil
	}
	s.sessionState = sessionStateError
	s.sessionError = err
	s.sessionUpdatedAt = time.Now()
	s.mu.Unlock()
	s.emitSessionStatus()
}

func (s *AuthenticatorService) closeSessionAfterReset(session sessionHandle) {
	s.mu.Lock()
	var detached sessionHandle
	if s.session == session {
		_, _, detached = s.closeSessionLocked(sessionStateStale, "Factory reset completed. Refresh devices before running more operations.")
	}
	s.mu.Unlock()
	closeDetachedSession(detached)
	s.emitSessionStatus()
}

func (s *AuthenticatorService) closeSessionLocked(state sessionLifecycleState, message string) (context.CancelFunc, []chan InteractionAnswer, sessionHandle) {
	cancel := s.activeCancel
	operationID := s.activeOperation
	var canceledInteractions []chan InteractionAnswer
	if operationID != "" {
		canceledInteractions = s.cancelInteractionsLocked(operationID)
	}
	detached := s.session
	s.session = nil
	s.activeOperation = ""
	s.activeCancel = nil
	s.sessionState = state
	if s.sessionState == "" {
		if s.selectedSelector == "" {
			s.sessionState = sessionStateIdle
		} else {
			s.sessionState = sessionStateClosed
		}
	}
	s.sessionUpdatedAt = time.Now()
	if message != "" {
		s.sessionError = &OperationError{Category: model.ErrorInvalidSession, Message: message}
	} else {
		s.sessionError = nil
	}
	return cancel, canceledInteractions, detached
}

func closeDetachedSession(session sessionHandle) {
	if session != nil {
		_ = session.Close()
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
	return s.statusSnapshotLocked(s.selectedDevice)
}

func (s *AuthenticatorService) statusSnapshotLocked(selected *report.DeviceReport) SessionStatus {
	selected = cloneReport(selected)
	if selected == nil {
		selected = cloneReport(s.selectedDevice)
	}
	state := s.sessionState
	if state == "" {
		state = sessionStateIdle
	}
	if s.session != nil {
		info := s.session.Info()
		if selected == nil {
			selected = cloneReport(&info.Device)
		}
		if info.Closed {
			state = sessionStateClosed
		} else if s.activeOperation != "" {
			state = sessionStateRunning
		} else if state != sessionStateStale && state != sessionStateError {
			state = sessionStateReady
		}
	} else if s.selectedSelector == "" && state != sessionStateError && state != sessionStateStale {
		state = sessionStateIdle
	} else if state == sessionStateIdle && s.selectedSelector != "" {
		state = sessionStateClosed
	}
	status := SessionStatus{
		SelectedSelector: s.selectedSelector,
		SelectedDevice:   selected,
		State:            state,
	}
	status.ActiveOperation = s.activeOperation
	status.Error = s.sessionError
	if !s.sessionOpenedAt.IsZero() {
		status.OpenedAt = s.sessionOpenedAt.Format(time.RFC3339)
	}
	if !s.sessionUpdatedAt.IsZero() {
		status.UpdatedAt = s.sessionUpdatedAt.Format(time.RFC3339)
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

func sameSelectedDevice(current *report.DeviceReport, discovered *report.DeviceReport) bool {
	if current == nil || discovered == nil {
		return current == nil && discovered == nil
	}
	if current.DeviceID != "" && discovered.DeviceID != current.DeviceID {
		return false
	}
	if current.Path != "" && discovered.Path != current.Path {
		return false
	}
	return true
}

func cloneReport(selected *report.DeviceReport) *report.DeviceReport {
	if selected == nil {
		return nil
	}
	cloned := *selected
	return &cloned
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
			Hint:     hintForRuntimeError(runtimeErr),
		}
	}

	return &OperationError{
		Message: err.Error(),
	}
}

func hintForRuntimeError(err model.RuntimeError) string {
	if err.Category == model.ErrorInvalidState && strings.Contains(err.Message, "large blob array capacity") {
		return "The authenticator large-blob array is full. Delete or garbage-collect unmatched blobs, or use a smaller payload."
	}

	return hintFor(err.Category)
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
		return "Refresh devices and make sure the authenticator is still connected."
	case model.ErrorInvalidSession:
		return "Open the selected session again or refresh devices, then run the operation again."
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
