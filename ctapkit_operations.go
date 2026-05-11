package main

import (
	"context"

	kitservice "github.com/go-ctap/kit/service"
)

func (s *CtapkitService) Inspect(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.Inspect(ctx, req)
}

func (s *CtapkitService) ListCredentials(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ListCredentials(ctx, req)
}

func (s *CtapkitService) DeleteCredential(ctx context.Context, req kitservice.CredentialDeleteRequest) (kitservice.OperationEnvelope, error) {
	return s.core.DeleteCredential(ctx, req)
}

func (s *CtapkitService) UpdateCredentialUser(ctx context.Context, req kitservice.CredentialUpdateRequest) (kitservice.OperationEnvelope, error) {
	return s.core.UpdateCredentialUser(ctx, req)
}

func (s *CtapkitService) ReadLargeBlob(ctx context.Context, req kitservice.LargeBlobReadRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ReadLargeBlob(ctx, req)
}

func (s *CtapkitService) ListLargeBlobs(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ListLargeBlobs(ctx, req)
}

func (s *CtapkitService) WriteLargeBlob(ctx context.Context, req kitservice.LargeBlobMutationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.WriteLargeBlob(ctx, req)
}

func (s *CtapkitService) DeleteLargeBlob(ctx context.Context, req kitservice.LargeBlobMutationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.DeleteLargeBlob(ctx, req)
}

func (s *CtapkitService) GarbageCollectLargeBlobs(ctx context.Context, req kitservice.LargeBlobGarbageCollectRequest) (kitservice.OperationEnvelope, error) {
	return s.core.GarbageCollectLargeBlobs(ctx, req)
}

func (s *CtapkitService) ConfigStatus(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ConfigStatus(ctx, req)
}

func (s *CtapkitService) SetPIN(ctx context.Context, req kitservice.PINSetRequest) (kitservice.OperationEnvelope, error) {
	return s.core.SetPIN(ctx, req)
}

func (s *CtapkitService) ChangePIN(ctx context.Context, req kitservice.PINChangeRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ChangePIN(ctx, req)
}

func (s *CtapkitService) SetAlwaysUV(ctx context.Context, req kitservice.AlwaysUVRequest) (kitservice.OperationEnvelope, error) {
	return s.core.SetAlwaysUV(ctx, req)
}

func (s *CtapkitService) SetMinPINLength(ctx context.Context, req kitservice.MinPINLengthRequest) (kitservice.OperationEnvelope, error) {
	return s.core.SetMinPINLength(ctx, req)
}

func (s *CtapkitService) BioSensorInfo(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.BioSensorInfo(ctx, req)
}

func (s *CtapkitService) BioList(ctx context.Context, req kitservice.OperationRequest) (kitservice.OperationEnvelope, error) {
	return s.core.BioList(ctx, req)
}

func (s *CtapkitService) BioEnroll(ctx context.Context, req kitservice.BioEnrollRequest) (kitservice.OperationEnvelope, error) {
	return s.core.BioEnroll(ctx, req)
}

func (s *CtapkitService) BioRename(ctx context.Context, req kitservice.BioRenameRequest) (kitservice.OperationEnvelope, error) {
	return s.core.BioRename(ctx, req)
}

func (s *CtapkitService) BioRemove(ctx context.Context, req kitservice.BioRemoveRequest) (kitservice.OperationEnvelope, error) {
	return s.core.BioRemove(ctx, req)
}

func (s *CtapkitService) ResetFactory(ctx context.Context, req kitservice.ResetFactoryRequest) (kitservice.OperationEnvelope, error) {
	return s.core.ResetFactory(ctx, req)
}

func (s *CtapkitService) MakeCredential(ctx context.Context, req kitservice.MakeCredentialRequest) (kitservice.OperationEnvelope, error) {
	return s.core.MakeCredential(ctx, req)
}

func (s *CtapkitService) GetAssertion(ctx context.Context, req kitservice.GetAssertionRequest) (kitservice.OperationEnvelope, error) {
	return s.core.GetAssertion(ctx, req)
}
