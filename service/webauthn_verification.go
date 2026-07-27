package service

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	appwebauthn "github.com/go-ctap/kit/model/webauthn"
)

type MakeCredentialVerificationRequest struct {
	Input  appwebauthn.MakeCredentialInput  `json:"input"`
	Result appwebauthn.MakeCredentialResult `json:"result"`
}

type GetAssertionVerificationRequest struct {
	Input                appwebauthn.GetAssertionInput                `json:"input"`
	Result               appwebauthn.GetAssertionResult               `json:"result"`
	VerificationMaterial []appwebauthn.CredentialVerificationMaterial `json:"verificationMaterial,omitempty"`
}

func (s *Service) VerifyMakeCredential(
	_ context.Context,
	req MakeCredentialVerificationRequest,
) appwebauthn.MakeCredentialVerification {
	return ctapkit.VerifyMakeCredential(req.Input, req.Result)
}

func (s *Service) VerifyGetAssertion(
	_ context.Context,
	req GetAssertionVerificationRequest,
) appwebauthn.GetAssertionVerification {
	return ctapkit.VerifyGetAssertion(req.Input, req.Result, req.VerificationMaterial)
}
