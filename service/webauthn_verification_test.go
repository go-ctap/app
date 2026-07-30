package service

import (
	"testing"

	"github.com/go-ctap/ctap/credential"
	appwebauthn "github.com/go-ctap/kit/model/webauthn"
)

func TestVerifyMakeCredentialReturnsCompactFailure(t *testing.T) {
	s := &Service{}
	verification := s.VerifyMakeCredential(t.Context(), MakeCredentialVerificationRequest{
		Input: appwebauthn.MakeCredentialInput{
			RP: credential.PublicKeyCredentialRpEntity{ID: "expected.example"},
		},
		Result: appwebauthn.MakeCredentialResult{
			RPID: "observed.example",
		},
	})

	if verification.Status != appwebauthn.VerificationStatusFailed {
		t.Fatalf("status = %q, want %q", verification.Status, appwebauthn.VerificationStatusFailed)
	}

	if len(verification.Issues) == 0 {
		t.Fatal("expected compact verification issues")
	}
}

func TestVerifyGetAssertionReturnsCompactFailure(t *testing.T) {
	s := &Service{}
	verification := s.VerifyGetAssertion(t.Context(), GetAssertionVerificationRequest{
		Input: appwebauthn.GetAssertionInput{
			RPID: "example.com",
		},
		Result: appwebauthn.GetAssertionResult{
			RPID: "example.com",
		},
	})

	if verification.Status != appwebauthn.VerificationStatusFailed {
		t.Fatalf("status = %q, want %q", verification.Status, appwebauthn.VerificationStatusFailed)
	}

	if len(verification.Issues) == 0 {
		t.Fatal("expected compact verification issues")
	}
}
