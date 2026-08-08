import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../../../bindings/github.com/telesma-app/ctap/attestation";
import {
  Category,
  Code,
  Failure,
} from "../../../../bindings/github.com/telesma-app/kit/model/failure";
import {
  AssertionVerification,
  AttestationType,
  GetAssertionVerification,
  MakeCredentialVerification,
  SignCountStatus,
  VerificationIssueCode,
  VerificationStatus,
} from "../../../../bindings/github.com/telesma-app/kit/model/webauthn";
import {
  AttestationTrustAssessment,
  AttestationTrustStatus,
  AuthenticatorStatus,
} from "../../../../bindings/github.com/telesma-app/mds/model";

import { setAppLocale } from "$lib/i18n";

import LabVerificationRoute from "$lib/components/lab/LabVerificationRoute.svelte";

describe("Lab verification route", () => {
  beforeEach(() => setAppLocale("en"));
  afterEach(() => cleanup());

  it("renders generated registration and MDS outcomes directly", () => {
    render(LabVerificationRoute, {
      mode: "make",
      state: {
        phase: "ready",
        verification: new MakeCredentialVerification({
          status: VerificationStatus.VerificationStatusVerified,
          rpIDHashMatches: true,
          userPresenceRequirementMet: true,
          userVerificationRequirementMet: true,
          credentialAlgorithmAllowed: true,
          attestationFormat:
            AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
          attestationType: AttestationType.AttestationTypeBasic,
          signatureValid: true,
        }),
      },
      attestationTrust: {
        phase: "ready",
        verification: new AttestationTrustAssessment({
          status: AttestationTrustStatus.AttestationTrustStatusTrusted,
          metadataFound: true,
          certificateChainTrusted: true,
          authenticatorStatuses: [
            AuthenticatorStatus.AuthenticatorStatusFIDOCertifiedL2,
            AuthenticatorStatus.AuthenticatorStatusFIDOCertified,
          ],
        }),
      },
      onRetryVerification: vi.fn(),
      onRetryAttestationTrust: vi.fn(),
    });

    expect(screen.getByRole("heading", { name: "Authenticator data" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attestation evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MDS attestation trust" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("RP ID hash")).toBeInTheDocument();
    expect(screen.getByText("Credential algorithm")).toBeInTheDocument();
    expect(screen.getByText("Signature")).toBeInTheDocument();
    expect(screen.getByText("packed")).toBeInTheDocument();
    expect(screen.getByText("basic")).toBeInTheDocument();
    expect(screen.getByText("FIDO_CERTIFIED_L2")).toBeInTheDocument();
    expect(screen.getByText("FIDO_CERTIFIED")).toBeInTheDocument();
  });

  it("uses the generated assertion status and keeps issue codes visible", () => {
    render(LabVerificationRoute, {
      mode: "get",
      state: {
        phase: "ready",
        verification: new GetAssertionVerification({
          status: VerificationStatus.VerificationStatusUnavailable,
          assertions: [
            new AssertionVerification({
              index: 0,
              credentialIDHex: "cafe",
              status: VerificationStatus.VerificationStatusUnavailable,
              rpIDHashMatches: true,
              userPresenceRequirementMet: true,
              userVerificationRequirementMet: true,
              credentialAllowed: true,
              signCount: SignCountStatus.SignCountStatusNotChecked,
              issues: [VerificationIssueCode.VerificationIssueVerificationMaterialMissing],
            }),
          ],
        }),
      },
      onRetryVerification: vi.fn(),
    });

    expect(
      screen.getByRole("heading", {
        name: "Credential and authenticator data",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("cafe")).toBeInTheDocument();
    expect(
      screen.getByText(VerificationIssueCode.VerificationIssueVerificationMaterialMissing),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("keeps multiple assertions keyboard-accessible through tabs", async () => {
    const user = userEvent.setup();
    const first = new AssertionVerification({
      index: 0,
      credentialIDHex: "first",
      status: VerificationStatus.VerificationStatusVerified,
      rpIDHashMatches: true,
      userPresenceRequirementMet: true,
      userVerificationRequirementMet: true,
      credentialAllowed: true,
      signatureValid: true,
      signCount: SignCountStatus.SignCountStatusAdvanced,
    });
    const second = new AssertionVerification({
      index: 1,
      credentialIDHex: "second",
      status: VerificationStatus.VerificationStatusFailed,
      rpIDHashMatches: false,
      userPresenceRequirementMet: true,
      userVerificationRequirementMet: true,
      credentialAllowed: true,
      signatureValid: true,
      signCount: SignCountStatus.SignCountStatusNotChecked,
      issues: [VerificationIssueCode.VerificationIssueRPIDHashMismatch],
    });
    const props = {
      mode: "get",
      state: {
        phase: "ready",
        verification: new GetAssertionVerification({
          status: VerificationStatus.VerificationStatusFailed,
          assertions: [first, second],
        }),
      },
      onRetryVerification: vi.fn(),
    } as const;
    const { rerender } = render(LabVerificationRoute, props);

    const secondTab = screen.getByRole("tab", { name: "Assertion 1" });

    await user.click(secondTab);

    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("second")).toBeVisible();
    expect(screen.getByText(VerificationIssueCode.VerificationIssueRPIDHashMismatch)).toBeVisible();

    await rerender(props);
    expect(secondTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps local verification failure retryable", async () => {
    const user = userEvent.setup();
    const onRetryVerification = vi.fn();

    render(LabVerificationRoute, {
      mode: "get",
      state: {
        phase: "error",
        error: new Failure({
          code: Code.CodeInternalError,
          category: Category.CategoryInternal,
        }),
      },
      onRetryVerification,
    });

    expect(
      screen.getByText("The operation failed because of an internal error."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry verification" }));
    expect(onRetryVerification).toHaveBeenCalledOnce();
  });

  it("keeps MDS assessment failure independently retryable", async () => {
    const user = userEvent.setup();
    const onRetryAttestationTrust = vi.fn();

    render(LabVerificationRoute, {
      mode: "make",
      state: {
        phase: "ready",
        verification: new MakeCredentialVerification({
          status: VerificationStatus.VerificationStatusVerified,
          rpIDHashMatches: true,
          userPresenceRequirementMet: true,
          userVerificationRequirementMet: true,
          credentialAlgorithmAllowed: true,
          attestationFormat:
            AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
          attestationType: AttestationType.AttestationTypeBasic,
          signatureValid: true,
        }),
      },
      attestationTrust: {
        phase: "error",
        error: new Failure({
          code: Code.CodeMDSFetchFailed,
          category: Category.CategoryTransportFailure,
        }),
      },
      onRetryVerification: vi.fn(),
      onRetryAttestationTrust,
    });

    expect(screen.getByText("MDS attestation trust could not be evaluated.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry MDS assessment" }));
    expect(onRetryAttestationTrust).toHaveBeenCalledOnce();
  });
});
