import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../../../bindings/github.com/go-ctap/ctap/attestation";
import {
  AssertionVerification,
  AttestationType,
  GetAssertionVerification,
  MakeCredentialVerification,
  SignCountStatus,
  VerificationIssueCode,
  VerificationStatus,
} from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

import LabVerificationResult from "./LabVerificationResult.svelte";

describe("Lab verification result", () => {
  it("renders the compact MakeCredential outcome matrix", () => {
    render(LabVerificationResult, {
      mode: "make",
      state: {
        phase: "ready",
        verification: new MakeCredentialVerification({
          status: VerificationStatus.VerificationStatusVerified,
          rpIDHashMatches: true,
          userPresenceRequirementMet: true,
          userVerificationRequirementMet: true,
          credentialAlgorithmAllowed: true,
          attestationFormat: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
          attestationType: AttestationType.AttestationTypeBasic,
          signatureValid: true,
        }),
      },
      onRetry: vi.fn(),
    });

    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getByText("RP ID hash")).toBeInTheDocument();
    expect(screen.getByText("Credential algorithm")).toBeInTheDocument();
    expect(screen.getByText("packed")).toBeInTheDocument();
  });

  it("keeps stable issue codes visible for assertion debugging", () => {
    render(LabVerificationResult, {
      mode: "get",
      state: {
        phase: "ready",
        verification: new GetAssertionVerification({
          status: VerificationStatus.VerificationStatusUnavailable,
          assertions: [new AssertionVerification({
            index: 0,
            credentialIDHex: "cafe",
            status: VerificationStatus.VerificationStatusUnavailable,
            rpIDHashMatches: true,
            userPresenceRequirementMet: true,
            userVerificationRequirementMet: true,
            credentialAllowed: true,
            signCount: SignCountStatus.SignCountStatusNotChecked,
            issues: [VerificationIssueCode.VerificationIssueVerificationMaterialMissing],
          })],
        }),
      },
      onRetry: vi.fn(),
    });

    expect(screen.getByText("cafe")).toBeInTheDocument();
    expect(screen.getByText(
      VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
    )).toBeInTheDocument();
    expect(screen.getByText("Not checked")).toBeInTheDocument();
  });
});
