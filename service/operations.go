package service

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/config"
	"github.com/go-ctap/kit/model/credentials"
	"github.com/go-ctap/kit/model/largeblobs"
	appoperation "github.com/go-ctap/kit/model/operation"
	"github.com/go-ctap/kit/model/webauthn"
)

type OperationRequest struct {
	SelectionID      SelectionID              `json:"selectionId"`
	VerificationFlow ctapkit.VerificationFlow `json:"verificationFlow,omitempty"`
}

type CredentialListRequest struct {
	OperationRequest
}

type CredentialDeleteRequest struct {
	OperationRequest
	CredentialIDHex string `json:"credentialIdHex"`
	DryRun          bool   `json:"dryRun,omitempty"`
}

type CredentialUpdateRequest struct {
	OperationRequest
	Target          credentials.CredentialTarget `json:"target"`
	Name            string                       `json:"name,omitempty"`
	DisplayName     string                       `json:"displayName,omitempty"`
	NameProvided    bool                         `json:"nameProvided,omitempty"`
	DisplayProvided bool                         `json:"displayProvided,omitempty"`
	DryRun          bool                         `json:"dryRun,omitempty"`
}

type LargeBlobReadRequest struct {
	OperationRequest
	CredentialIDHex string                `json:"credentialIdHex"`
	DecodeMode      largeblobs.DecodeMode `json:"decodeMode,omitempty"`
}

type LargeBlobListRequest struct {
	OperationRequest
}

type LargeBlobMutationRequest struct {
	OperationRequest
	CredentialIDHex string `json:"credentialIdHex"`
	Payload         []byte `json:"payload,omitempty"`
	DryRun          bool   `json:"dryRun,omitempty"`
}

type LargeBlobGarbageCollectRequest struct {
	OperationRequest
	DryRun bool `json:"dryRun,omitempty"`
}

type PINSetRequest struct {
	OperationRequest
	// NewPIN participates in JSON transport. Consumers own redaction at the
	// application boundary and must not log or persist serialized requests.
	NewPIN string `json:"newPIN"`
	DryRun bool   `json:"dryRun,omitempty"`
}

type PINChangeRequest struct {
	OperationRequest
	// CurrentPIN and NewPIN participate in JSON transport. Consumers own
	// redaction at the application boundary and must not log or persist them.
	CurrentPIN string `json:"currentPIN"`
	NewPIN     string `json:"newPIN"`
	DryRun     bool   `json:"dryRun,omitempty"`
}

type AlwaysUVRequest struct {
	OperationRequest
	Target config.AlwaysUVTarget `json:"target"`
	DryRun bool                  `json:"dryRun,omitempty"`
}

type MinPINLengthRequest struct {
	OperationRequest
	NewMinPINLength     *uint    `json:"newMinPINLength,omitempty"`
	MinPINLengthRPIDs   []string `json:"minPinLengthRPIDs,omitempty"`
	ForceChangePIN      bool     `json:"forceChangePin,omitempty"`
	PINComplexityPolicy bool     `json:"pinComplexityPolicy,omitempty"`
	DryRun              bool     `json:"dryRun,omitempty"`
}

type EnableLongTouchForResetRequest struct {
	OperationRequest
	DryRun bool `json:"dryRun,omitempty"`
}

type BioEnrollRequest struct {
	OperationRequest
	TimeoutMilliseconds uint `json:"timeoutMilliseconds,omitempty"`
	DryRun              bool `json:"dryRun,omitempty"`
}

type BioRenameRequest struct {
	OperationRequest
	TemplateIDHex string `json:"templateIdHex"`
	FriendlyName  string `json:"friendlyName"`
	DryRun        bool   `json:"dryRun,omitempty"`
}

type BioRemoveRequest struct {
	OperationRequest
	TemplateIDHex string `json:"templateIdHex"`
	DryRun        bool   `json:"dryRun,omitempty"`
}

type ResetFactoryRequest struct {
	OperationRequest
	DryRun bool `json:"dryRun,omitempty"`
}

type MakeCredentialRequest struct {
	OperationRequest
	webauthn.MakeCredentialInput
	DryRun bool `json:"dryRun,omitempty"`
}

type GetAssertionRequest struct {
	OperationRequest
	webauthn.GetAssertionInput
	DryRun bool `json:"dryRun,omitempty"`
}

func (s *Service) Inspect(ctx context.Context, req OperationRequest) (InspectEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req,
		appoperation.Inspect,
		bindInputlessOperation((*ctapkit.Authenticator).Inspect),
	)

	return InspectEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ListCredentials(ctx context.Context, req CredentialListRequest) (CredentialsEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.ListCredentials,
		bindInputlessOperation((*ctapkit.Authenticator).ListCredentials),
	)
	return CredentialsEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) CredentialStoreState(ctx context.Context, req OperationRequest) (CredentialStoreStateEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req,
		appoperation.CredentialStoreState,
		bindInputlessOperation((*ctapkit.Authenticator).CredentialStoreState),
	)

	return CredentialStoreStateEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) DeleteCredential(ctx context.Context, req CredentialDeleteRequest) (CredentialDeleteEnvelope, error) {
	operation := credentials.DeleteOperation{
		CredentialIDHex: req.CredentialIDHex,
		DryRun:          req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.DeleteCredential,
		bindOperation(operation, (*ctapkit.Authenticator).DeleteCredential),
	)
	return CredentialDeleteEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) UpdateCredentialUser(ctx context.Context, req CredentialUpdateRequest) (CredentialUpdateEnvelope, error) {
	operation := credentials.UpdateUserOperation{
		Target:          req.Target,
		Name:            req.Name,
		DisplayName:     req.DisplayName,
		NameProvided:    req.NameProvided,
		DisplayProvided: req.DisplayProvided,
		DryRun:          req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.UpdateCredentialUser,
		bindOperation(operation, (*ctapkit.Authenticator).UpdateCredentialUser),
	)
	return CredentialUpdateEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ReadLargeBlob(ctx context.Context, req LargeBlobReadRequest) (LargeBlobReadEnvelope, error) {
	operation := largeblobs.ReadOperation{
		CredentialIDHex: req.CredentialIDHex,
		DecodeMode:      req.DecodeMode,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.ReadLargeBlob,
		bindOperation(operation, (*ctapkit.Authenticator).ReadLargeBlob),
	)
	return LargeBlobReadEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ListLargeBlobs(ctx context.Context, req LargeBlobListRequest) (LargeBlobListEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.ListLargeBlobs,
		bindInputlessOperation((*ctapkit.Authenticator).ListLargeBlobs),
	)
	return LargeBlobListEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) WriteLargeBlob(ctx context.Context, req LargeBlobMutationRequest) (LargeBlobMutationEnvelope, error) {
	operation := largeblobs.WriteOperation{
		CredentialIDHex: req.CredentialIDHex,
		Payload:         req.Payload,
		DryRun:          req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.WriteLargeBlob,
		bindOperation(operation, (*ctapkit.Authenticator).WriteLargeBlob),
	)
	return LargeBlobMutationEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) DeleteLargeBlob(ctx context.Context, req LargeBlobMutationRequest) (LargeBlobMutationEnvelope, error) {
	operation := largeblobs.DeleteOperation{
		CredentialIDHex: req.CredentialIDHex,
		DryRun:          req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.DeleteLargeBlob,
		bindOperation(operation, (*ctapkit.Authenticator).DeleteLargeBlob),
	)
	return LargeBlobMutationEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) GarbageCollectLargeBlobs(ctx context.Context, req LargeBlobGarbageCollectRequest) (LargeBlobMutationEnvelope, error) {
	operation := largeblobs.GarbageCollectOperation{
		DryRun: req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.GarbageCollectLargeBlobs,
		bindOperation(operation, (*ctapkit.Authenticator).GarbageCollectLargeBlobs),
	)
	return LargeBlobMutationEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ConfigStatus(ctx context.Context, req OperationRequest) (ConfigStatusEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req,
		appoperation.ConfigStatus,
		bindInputlessOperation((*ctapkit.Authenticator).ConfigStatus),
	)
	return ConfigStatusEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) SetPIN(ctx context.Context, req PINSetRequest) (PINEnvelope, error) {
	operation := config.SetPINOperation{
		NewPIN: req.NewPIN,
		DryRun: req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.SetPIN,
		bindOperation(operation, (*ctapkit.Authenticator).SetPIN),
	)
	return PINEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ChangePIN(ctx context.Context, req PINChangeRequest) (PINEnvelope, error) {
	operation := config.ChangePINOperation{
		CurrentPIN: req.CurrentPIN,
		NewPIN:     req.NewPIN,
		DryRun:     req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.ChangePIN,
		bindOperation(operation, (*ctapkit.Authenticator).ChangePIN),
	)
	return PINEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) SetAlwaysUV(ctx context.Context, req AlwaysUVRequest) (AuthenticatorConfigEnvelope, error) {
	operation := config.SetAlwaysUVOperation{
		Target: req.Target,
		DryRun: req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.SetAlwaysUV,
		bindOperation(operation, (*ctapkit.Authenticator).SetAlwaysUV),
	)
	return AuthenticatorConfigEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) SetMinPINLength(ctx context.Context, req MinPINLengthRequest) (AuthenticatorConfigEnvelope, error) {
	operation := config.SetMinPINLengthOperation{
		NewMinPINLength:     req.NewMinPINLength,
		MinPINLengthRPIDs:   req.MinPINLengthRPIDs,
		ForceChangePIN:      req.ForceChangePIN,
		PINComplexityPolicy: req.PINComplexityPolicy,
		DryRun:              req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.SetMinPINLength,
		bindOperation(operation, (*ctapkit.Authenticator).SetMinPINLength),
	)
	return AuthenticatorConfigEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) EnableLongTouchForReset(ctx context.Context, req EnableLongTouchForResetRequest) (AuthenticatorConfigEnvelope, error) {
	operation := config.EnableLongTouchForResetOperation{
		DryRun: req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.EnableLongTouchForReset,
		bindOperation(operation, (*ctapkit.Authenticator).EnableLongTouchForReset),
	)

	return AuthenticatorConfigEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) BioSensorInfo(ctx context.Context, req OperationRequest) (BioSensorEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req,
		appoperation.BioSensorInfo,
		bindInputlessOperation((*ctapkit.Authenticator).BioSensorInfo),
	)
	return BioSensorEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) BioList(ctx context.Context, req OperationRequest) (BioListEnvelope, error) {
	meta, result, err := runOperation(
		s,
		ctx,
		req,
		appoperation.BioList,
		bindInputlessOperation((*ctapkit.Authenticator).BioList),
	)
	return BioListEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) BioEnroll(ctx context.Context, req BioEnrollRequest) (BioEnrollEnvelope, error) {
	operation := config.BioEnrollOperation{
		TimeoutMilliseconds: req.TimeoutMilliseconds,
		DryRun:              req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.BioEnroll,
		bindOperation(operation, (*ctapkit.Authenticator).BioEnroll),
	)
	return BioEnrollEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) BioRename(ctx context.Context, req BioRenameRequest) (BioMutationEnvelope, error) {
	operation := config.BioRenameOperation{
		TemplateIDHex: req.TemplateIDHex,
		FriendlyName:  req.FriendlyName,
		DryRun:        req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.BioRename,
		bindOperation(operation, (*ctapkit.Authenticator).BioRename),
	)
	return BioMutationEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) BioRemove(ctx context.Context, req BioRemoveRequest) (BioMutationEnvelope, error) {
	operation := config.BioRemoveOperation{
		TemplateIDHex: req.TemplateIDHex,
		DryRun:        req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.BioRemove,
		bindOperation(operation, (*ctapkit.Authenticator).BioRemove),
	)
	return BioMutationEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) ResetFactory(ctx context.Context, req ResetFactoryRequest) (ResetFactoryEnvelope, error) {
	operation := config.ResetFactoryOperation{
		DryRun: req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.ResetFactory,
		bindOperation(operation, (*ctapkit.Authenticator).ResetFactory),
	)
	return ResetFactoryEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) MakeCredential(ctx context.Context, req MakeCredentialRequest) (MakeCredentialEnvelope, error) {
	operation := webauthn.MakeCredentialOperation{
		MakeCredentialInput: req.MakeCredentialInput,
		DryRun:              req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.MakeCredential,
		bindOperation(operation, (*ctapkit.Authenticator).MakeCredential),
	)
	return MakeCredentialEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}

func (s *Service) GetAssertion(ctx context.Context, req GetAssertionRequest) (GetAssertionEnvelope, error) {
	operation := webauthn.GetAssertionOperation{
		GetAssertionInput: req.GetAssertionInput,
		DryRun:            req.DryRun,
	}
	meta, result, err := runOperation(
		s,
		ctx,
		req.OperationRequest,
		appoperation.GetAssertion,
		bindOperation(operation, (*ctapkit.Authenticator).GetAssertion),
	)
	return GetAssertionEnvelope{OperationEnvelopeMeta: meta, Result: result}, err
}
