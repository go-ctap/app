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
)

var operationSequence uint64

type AuthenticatorService struct {
	mu               sync.Mutex
	devices          []ctapkit.Device
	selectedSelector string
	active           map[string]context.CancelFunc
	interactions     map[string]chan InteractionAnswer
}

func NewAuthenticatorService() *AuthenticatorService {
	return &AuthenticatorService{
		active:       make(map[string]context.CancelFunc),
		interactions: make(map[string]chan InteractionAnswer),
	}
}

type DiscoverRequest struct {
	Transport string `json:"transport,omitempty"`
}

type DiscoveryResponse struct {
	Devices          []report.DeviceReport `json:"devices"`
	SelectedSelector string                `json:"selectedSelector,omitempty"`
	SelectedDevice   *report.DeviceReport  `json:"selectedDevice,omitempty"`
	Error            *OperationError       `json:"error,omitempty"`
}

type OperationRequest struct {
	Selector         string                 `json:"selector,omitempty"`
	VerificationFlow model.VerificationFlow `json:"verificationFlow,omitempty"`
}

type OperationEnvelope struct {
	OperationID    string               `json:"operationId"`
	SelectedDevice *report.DeviceReport `json:"selectedDevice,omitempty"`
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
	devices, err := ctapkit.DiscoverDevices(ctx, discoverOptions(req.Transport)...)
	if err != nil {
		return DiscoveryResponse{Error: operationError(err)}
	}

	reports := make([]report.DeviceReport, 0, len(devices))
	for _, device := range devices {
		reports = append(reports, device.Report())
	}

	s.mu.Lock()
	s.devices = devices
	s.selectedSelector = reconcileSelectionLocked(s.selectedSelector, reports)
	selected := selectedReport(reports, s.selectedSelector)
	s.mu.Unlock()

	return DiscoveryResponse{
		Devices:          reports,
		SelectedSelector: s.selectedSelector,
		SelectedDevice:   selected,
	}
}

func (s *AuthenticatorService) Select(ctx context.Context, selector string) DiscoveryResponse {
	s.mu.Lock()
	defer s.mu.Unlock()

	reports := deviceReports(s.devices)
	if _, err := ctapkit.SelectDevice(s.devices, selector); err != nil {
		return DiscoveryResponse{
			Devices: reports,
			Error:   operationError(err),
		}
	}
	s.selectedSelector = strings.TrimSpace(selector)

	return DiscoveryResponse{
		Devices:          reports,
		SelectedSelector: s.selectedSelector,
		SelectedDevice:   selectedReport(reports, s.selectedSelector),
	}
}

func (s *AuthenticatorService) CancelOperation(ctx context.Context, operationID string) bool {
	s.mu.Lock()
	cancel, ok := s.active[operationID]
	canceledInteractions := make([]chan InteractionAnswer, 0)
	for interactionID, ch := range s.interactions {
		if strings.HasPrefix(interactionID, operationID+":") {
			canceledInteractions = append(canceledInteractions, ch)
			delete(s.interactions, interactionID)
		}
	}
	s.mu.Unlock()
	if ok {
		cancel()
	}
	for _, ch := range canceledInteractions {
		select {
		case ch <- InteractionAnswer{Canceled: true}:
		default:
		}
	}
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
	runCtx, cancel := context.WithCancel(ctx)
	s.trackOperation(operationID, cancel)
	defer s.untrackOperation(operationID)

	devices, err := ctapkit.DiscoverDevices(runCtx)
	if err != nil {
		return OperationEnvelope{OperationID: operationID, Error: operationError(err)}
	}
	selector := s.selector(req.Selector, deviceReports(devices))
	device, err := ctapkit.SelectDevice(devices, selector)
	if err != nil {
		return OperationEnvelope{OperationID: operationID, Error: operationError(err)}
	}

	selected := device.Report()
	session, err := ctapkit.OpenSession(runCtx, device, ctapkit.WithEventSink(operationEventSink{operationID: operationID}))
	if err != nil {
		return OperationEnvelope{OperationID: operationID, SelectedDevice: &selected, Error: operationError(err)}
	}
	defer session.Close()

	runOptions := []ctapkit.RunOption{}
	if req.VerificationFlow != "" {
		runOptions = append(runOptions, ctapkit.WithVerificationFlow(req.VerificationFlow))
	}
	result, err := session.Run(runCtx, operation, s.interactionHandler(operationID), runOptions...)
	if err != nil {
		return OperationEnvelope{OperationID: operationID, SelectedDevice: &selected, Error: operationError(err)}
	}

	return OperationEnvelope{OperationID: operationID, SelectedDevice: &selected, Result: result}
}

func (s *AuthenticatorService) selector(requested string, reports []report.DeviceReport) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(requested) != "" {
		s.selectedSelector = strings.TrimSpace(requested)
		return s.selectedSelector
	}
	s.selectedSelector = reconcileSelectionLocked(s.selectedSelector, reports)
	return s.selectedSelector
}

func (s *AuthenticatorService) trackOperation(operationID string, cancel context.CancelFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.active[operationID] = cancel
}

func (s *AuthenticatorService) untrackOperation(operationID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.active, operationID)
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
	operationID string
}

func (s operationEventSink) Emit(event model.OperationEvent) {
	emit(eventOperationProgress, OperationEventEnvelope{
		OperationID: s.operationID,
		Event:       event,
	})
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
