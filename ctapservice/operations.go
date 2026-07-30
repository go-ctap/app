package ctapservice

import (
	"context"

	appwebauthn "github.com/go-ctap/kit/model/webauthn"
	mdsmodel "github.com/go-ctap/mds/model"

	appservice "telesma/service"
)

func (s *Service) Inspect(ctx context.Context, req appservice.OperationRequest) appservice.InspectEnvelope {
	return s.core.Inspect(ctx, req)
}

func (s *Service) ListCredentials(ctx context.Context, req appservice.OperationRequest) appservice.CredentialsEnvelope {
	return s.core.ListCredentials(ctx, req)
}

func (s *Service) DeleteCredential(ctx context.Context, req appservice.CredentialDeleteRequest) appservice.CredentialDeleteEnvelope {
	return s.core.DeleteCredential(ctx, req)
}

func (s *Service) UpdateCredentialUser(ctx context.Context, req appservice.CredentialUpdateRequest) appservice.CredentialUpdateEnvelope {
	return s.core.UpdateCredentialUser(ctx, req)
}

func (s *Service) ReadLargeBlob(ctx context.Context, req appservice.LargeBlobReadRequest) appservice.LargeBlobReadEnvelope {
	return s.core.ReadLargeBlob(ctx, req)
}

func (s *Service) DecodeLargeBlob(ctx context.Context, req appservice.LargeBlobDecodeRequest) appservice.LargeBlobDecodeEnvelope {
	return s.core.DecodeLargeBlob(ctx, req)
}

func (s *Service) ListLargeBlobs(ctx context.Context, req appservice.OperationRequest) appservice.LargeBlobListEnvelope {
	return s.core.ListLargeBlobs(ctx, req)
}

func (s *Service) WriteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) appservice.LargeBlobMutationEnvelope {
	return s.core.WriteLargeBlob(ctx, req)
}

func (s *Service) DeleteLargeBlob(ctx context.Context, req appservice.LargeBlobMutationRequest) appservice.LargeBlobMutationEnvelope {
	return s.core.DeleteLargeBlob(ctx, req)
}

func (s *Service) GarbageCollectLargeBlobs(ctx context.Context, req appservice.LargeBlobGarbageCollectRequest) appservice.LargeBlobMutationEnvelope {
	return s.core.GarbageCollectLargeBlobs(ctx, req)
}

func (s *Service) ConfigStatus(ctx context.Context, req appservice.OperationRequest) appservice.ConfigStatusEnvelope {
	return s.core.ConfigStatus(ctx, req)
}

func (s *Service) SetPIN(ctx context.Context, req appservice.PINSetRequest) appservice.PINEnvelope {
	return s.core.SetPIN(ctx, req)
}

func (s *Service) ChangePIN(ctx context.Context, req appservice.PINChangeRequest) appservice.PINEnvelope {
	return s.core.ChangePIN(ctx, req)
}

func (s *Service) SetAlwaysUV(ctx context.Context, req appservice.AlwaysUVRequest) appservice.AuthenticatorConfigEnvelope {
	return s.core.SetAlwaysUV(ctx, req)
}

func (s *Service) EnableEnterpriseAttestation(ctx context.Context, req appservice.EnableEnterpriseAttestationRequest) appservice.AuthenticatorConfigEnvelope {
	return s.core.EnableEnterpriseAttestation(ctx, req)
}

func (s *Service) SetMinPINLength(ctx context.Context, req appservice.MinPINLengthRequest) appservice.AuthenticatorConfigEnvelope {
	return s.core.SetMinPINLength(ctx, req)
}

func (s *Service) EnableLongTouchForReset(ctx context.Context, req appservice.EnableLongTouchForResetRequest) appservice.AuthenticatorConfigEnvelope {
	return s.core.EnableLongTouchForReset(ctx, req)
}

func (s *Service) BioSensorInfo(ctx context.Context, req appservice.OperationRequest) appservice.BioSensorEnvelope {
	return s.core.BioSensorInfo(ctx, req)
}

func (s *Service) BioList(ctx context.Context, req appservice.OperationRequest) appservice.BioListEnvelope {
	return s.core.BioList(ctx, req)
}

func (s *Service) BioEnroll(ctx context.Context, req appservice.BioEnrollRequest) appservice.BioEnrollEnvelope {
	return s.core.BioEnroll(ctx, req)
}

func (s *Service) BioRename(ctx context.Context, req appservice.BioRenameRequest) appservice.BioMutationEnvelope {
	return s.core.BioRename(ctx, req)
}

func (s *Service) BioRemove(ctx context.Context, req appservice.BioRemoveRequest) appservice.BioMutationEnvelope {
	return s.core.BioRemove(ctx, req)
}

func (s *Service) ResetFactory(ctx context.Context, req appservice.ResetFactoryRequest) appservice.ResetFactoryEnvelope {
	return s.core.ResetFactory(ctx, req)
}

func (s *Service) MakeCredential(ctx context.Context, req appservice.MakeCredentialRequest) appservice.MakeCredentialEnvelope {
	return s.core.MakeCredential(ctx, req)
}

func (s *Service) GetAssertion(ctx context.Context, req appservice.GetAssertionRequest) appservice.GetAssertionEnvelope {
	return s.core.GetAssertion(ctx, req)
}

func (s *Service) VerifyMakeCredential(
	ctx context.Context,
	req appservice.MakeCredentialVerificationRequest,
) appwebauthn.MakeCredentialVerification {
	return s.core.VerifyMakeCredential(ctx, req)
}

func (s *Service) VerifyGetAssertion(
	ctx context.Context,
	req appservice.GetAssertionVerificationRequest,
) appwebauthn.GetAssertionVerification {
	return s.core.VerifyGetAssertion(ctx, req)
}

func (s *Service) AssessMakeCredentialAttestation(
	ctx context.Context,
	req appservice.MakeCredentialAttestationAssessmentRequest,
) mdsmodel.AttestationTrustAssessment {
	return s.core.AssessMakeCredentialAttestation(ctx, req)
}
