package ctapservice

import (
	"context"

	appservice "telesma/service"
)

func (s *Service) Inspect(ctx context.Context, req appservice.OperationRequest) (appservice.InspectEnvelope, error) {
	return s.core.Inspect(ctx, req)
}

func (s *Service) ListCredentials(ctx context.Context, req appservice.CredentialListRequest) (appservice.CredentialsEnvelope, error) {
	return s.core.ListCredentials(ctx, req)
}

func (s *Service) CredentialStoreState(ctx context.Context, req appservice.OperationRequest) (appservice.CredentialStoreStateEnvelope, error) {
	return s.core.CredentialStoreState(ctx, req)
}

func (s *Service) DeleteCredential(ctx context.Context, req appservice.CredentialDeleteRequest) (appservice.CredentialDeleteEnvelope, error) {
	return s.core.DeleteCredential(ctx, req)
}

func (s *Service) UpdateCredentialUser(ctx context.Context, req appservice.CredentialUpdateRequest) (appservice.CredentialUpdateEnvelope, error) {
	return s.core.UpdateCredentialUser(ctx, req)
}

func (s *Service) ReadLargeBlob(ctx context.Context, req appservice.LargeBlobReadRequest) (appservice.LargeBlobReadEnvelope, error) {
	return s.core.ReadLargeBlob(ctx, req)
}

func (s *Service) ListLargeBlobs(ctx context.Context, req appservice.LargeBlobListRequest) (appservice.LargeBlobListEnvelope, error) {
	return s.core.ListLargeBlobs(ctx, req)
}

func (s *Service) WriteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.WriteLargeBlob(ctx, req)
}

func (s *Service) DeleteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.DeleteLargeBlob(ctx, req)
}

func (s *Service) GarbageCollectLargeBlobs(ctx context.Context, req appservice.LargeBlobGarbageCollectRequest) (appservice.LargeBlobMutationEnvelope, error) {
	return s.core.GarbageCollectLargeBlobs(ctx, req)
}

func (s *Service) ConfigStatus(ctx context.Context, req appservice.OperationRequest) (appservice.ConfigStatusEnvelope, error) {
	return s.core.ConfigStatus(ctx, req)
}

func (s *Service) SetPIN(ctx context.Context, req appservice.PINSetRequest) (appservice.PINEnvelope, error) {
	return s.core.SetPIN(ctx, req)
}

func (s *Service) ChangePIN(ctx context.Context, req appservice.PINChangeRequest) (appservice.PINEnvelope, error) {
	return s.core.ChangePIN(ctx, req)
}

func (s *Service) SetAlwaysUV(ctx context.Context, req appservice.AlwaysUVRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.SetAlwaysUV(ctx, req)
}

func (s *Service) SetMinPINLength(ctx context.Context, req appservice.MinPINLengthRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.SetMinPINLength(ctx, req)
}

func (s *Service) EnableLongTouchForReset(ctx context.Context, req appservice.EnableLongTouchForResetRequest) (appservice.AuthenticatorConfigEnvelope, error) {
	return s.core.EnableLongTouchForReset(ctx, req)
}

func (s *Service) BioSensorInfo(ctx context.Context, req appservice.OperationRequest) (appservice.BioSensorEnvelope, error) {
	return s.core.BioSensorInfo(ctx, req)
}

func (s *Service) BioList(ctx context.Context, req appservice.OperationRequest) (appservice.BioListEnvelope, error) {
	return s.core.BioList(ctx, req)
}

func (s *Service) BioEnroll(ctx context.Context, req appservice.BioEnrollRequest) (appservice.BioEnrollEnvelope, error) {
	return s.core.BioEnroll(ctx, req)
}

func (s *Service) BioRename(ctx context.Context, req appservice.BioRenameRequest) (appservice.BioMutationEnvelope, error) {
	return s.core.BioRename(ctx, req)
}

func (s *Service) BioRemove(ctx context.Context, req appservice.BioRemoveRequest) (appservice.BioMutationEnvelope, error) {
	return s.core.BioRemove(ctx, req)
}

func (s *Service) ResetFactory(ctx context.Context, req appservice.ResetFactoryRequest) (appservice.ResetFactoryEnvelope, error) {
	return s.core.ResetFactory(ctx, req)
}

func (s *Service) MakeCredential(ctx context.Context, req appservice.MakeCredentialRequest) (appservice.MakeCredentialEnvelope, error) {
	return s.core.MakeCredential(ctx, req)
}

func (s *Service) GetAssertion(ctx context.Context, req appservice.GetAssertionRequest) (appservice.GetAssertionEnvelope, error) {
	return s.core.GetAssertion(ctx, req)
}
