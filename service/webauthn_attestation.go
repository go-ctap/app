package service

import (
	"context"
	"encoding/hex"
	"errors"
	"time"

	ctapattestation "github.com/go-ctap/ctap/attestation"
	ctapkit "github.com/go-ctap/kit"
	appwebauthn "github.com/go-ctap/kit/model/webauthn"
	"github.com/go-ctap/mds"
	mdsmodel "github.com/go-ctap/mds/model"
	"github.com/google/uuid"
)

type MakeCredentialAttestationAssessmentRequest struct {
	Input    appwebauthn.MakeCredentialInput  `json:"input"`
	Result   appwebauthn.MakeCredentialResult `json:"result"`
	Metadata mdsmodel.LookupResult            `json:"metadata"`
}

func (s *Service) AssessMakeCredentialAttestation(
	_ context.Context,
	req MakeCredentialAttestationAssessmentRequest,
) mdsmodel.AttestationTrustAssessment {
	aaguid, err := uuid.Parse(req.Result.AAGUID)
	if err != nil {
		return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueEvidenceMalformed)
	}
	raw, err := hex.DecodeString(req.Result.AttestationObjectCBORHex)
	if err != nil {
		return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueEvidenceMalformed)
	}
	object, err := ctapattestation.ParseObject(raw)
	if err != nil {
		return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueEvidenceMalformed)
	}
	attestationType, certificateChain, err := object.TypeAndCertificateChain()
	if errors.Is(err, ctapattestation.ErrFormatUnsupported) {
		return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueFormatUnsupported)
	}
	if err != nil {
		return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueEvidenceMalformed)
	}
	if attestationType == ctapattestation.TypeBasic {
		verification := ctapkit.VerifyMakeCredential(req.Input, req.Result)
		if verification.Status != appwebauthn.VerificationStatusVerified ||
			verification.AttestationType != appwebauthn.AttestationTypeBasic ||
			verification.SignatureValid == nil ||
			!*verification.SignatureValid {
			return unavailableAttestationAssessment(mdsmodel.AttestationTrustIssueEvidenceUnverified)
		}
	}

	return mds.AssessAttestation(mds.AttestationEvidence{
		AAGUID:           aaguid,
		Type:             mds.AttestationType(attestationType),
		CertificateChain: certificateChain,
	}, req.Metadata, time.Time{})
}

func unavailableAttestationAssessment(
	issue mdsmodel.AttestationTrustIssueCode,
) mdsmodel.AttestationTrustAssessment {
	return mdsmodel.AttestationTrustAssessment{
		Status: mdsmodel.AttestationTrustStatusUnavailable,
		Issues: []mdsmodel.AttestationTrustIssueCode{issue},
	}
}
