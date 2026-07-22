package main

import (
	"context"

	appservice "telesma/service"
)

func (s *CtapkitService) Inspect(ctx context.Context, req appservice.OperationRequest) (appservice.InspectEnvelope, error) {
	return s.core.Inspect(ctx, req)
}

func (s *CtapkitService) ListCredentials(ctx context.Context, req appservice.CredentialListRequest) (appservice.CredentialsEnvelope, error) {
	return s.core.ListCredentials(ctx, req)
}

func (s *CtapkitService) CredentialStoreState(ctx context.Context, req appservice.OperationRequest) (appservice.CredentialStoreStateEnvelope, error) {
	return s.core.CredentialStoreState(ctx, req)
}

func (s *CtapkitService) DeleteCredential(ctx context.Context, req appservice.CredentialDeleteRequest) (appservice.CredentialDeleteEnvelope, error) {
	return s.core.DeleteCredential(ctx, req)
}

func (s *CtapkitService) UpdateCredentialUser(ctx context.Context, req appservice.CredentialUpdateRequest) (appservice.CredentialUpdateEnvelope, error) {
	return s.core.UpdateCredentialUser(ctx, req)
}

func (s *CtapkitService) ReadLargeBlob(ctx context.Context, req appservice.LargeBlobReadRequest) (appservice.LargeBlobReadEnvelope, error) {
	return s.core.ReadLargeBlob(ctx, req)
}

func (s *CtapkitService) ListLargeBlobs(ctx context.Context, req appservice.LargeBlobListRequest) (appservice.LargeBlobListEnvelope, error) {
	return s.core.ListLargeBlobs(ctx, req)
}

func (s *CtapkitService) WriteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.WriteLargeBlob(ctx, req)
}

func (s *CtapkitService) DeleteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.DeleteLargeBlob(ctx, req)
}

func (s *CtapkitService) GarbageCollectLargeBlobs(ctx context.Context, req appservice.LargeBlobGarbageCollectRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.GarbageCollectLargeBlobs(ctx, req)
}

func (s *CtapkitService) ConfigStatus(ctx context.Context, req appservice.OperationRequest) (appservice.ConfigStatusEnvelope, error) {
	return s.core.ConfigStatus(ctx, req)
}

func (s *CtapkitService) SetPIN(ctx context.Context, req appservice.PINSetRequest) (appservice.PINEnvelope, error) {
	return s.core.SetPIN(ctx, req)
}

func (s *CtapkitService) ChangePIN(ctx context.Context, req appservice.PINChangeRequest) (appservice.PINEnvelope, error) {
	return s.core.ChangePIN(ctx, req)
}

func (s *CtapkitService) SetAlwaysUV(ctx context.Context, req appservice.AlwaysUVRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.SetAlwaysUV(ctx, req)
}

func (s *CtapkitService) SetMinPINLength(ctx context.Context, req appservice.MinPINLengthRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.SetMinPINLength(ctx, req)
}

func (s *CtapkitService) EnableLongTouchForReset(ctx context.Context, req appservice.EnableLongTouchForResetRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.EnableLongTouchForReset(ctx, req)
}

func (s *CtapkitService) BioSensorInfo(ctx context.Context, req appservice.OperationRequest) (appservice.BioSensorEnvelope, error) {
	return s.core.BioSensorInfo(ctx, req)
}

func (s *CtapkitService) BioList(ctx context.Context, req appservice.OperationRequest) (appservice.BioListEnvelope, error) {
	return s.core.BioList(ctx, req)
}

func (s *CtapkitService) BioEnroll(ctx context.Context, req appservice.BioEnrollRequest) (appservice.BioEnrollEnvelope, error) {
	return s.core.BioEnroll(ctx, req)
}

func (s *CtapkitService) BioRename(ctx context.Context, req appservice.BioRenameRequest) (appservice.BioMutationEnvelope, error) {
	return s.core.BioRename(ctx, req)
}

func (s *CtapkitService) BioRemove(ctx context.Context, req appservice.BioRemoveRequest) (appservice.BioMutationEnvelope, error) {
	return s.core.BioRemove(ctx, req)
}

func (s *CtapkitService) ResetFactory(ctx context.Context, req appservice.ResetFactoryRequest) (appservice.ResetFactoryEnvelope, error) {
	return s.core.ResetFactory(ctx, req)
}

func (s *CtapkitService) MakeCredential(ctx context.Context, req appservice.MakeCredentialRequest) (appservice.MakeCredentialEnvelope, error) {
	return s.core.MakeCredential(ctx, req)
}

func (s *CtapkitService) GetAssertion(ctx context.Context, req appservice.GetAssertionRequest) (appservice.GetAssertionEnvelope, error) {
	return s.core.GetAssertion(ctx, req)
}
