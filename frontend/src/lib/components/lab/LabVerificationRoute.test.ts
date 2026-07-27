import {cleanup, render, screen} from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {AttestationStatementFormatIdentifier} from "../../../../bindings/github.com/go-ctap/ctap/attestation";
import {
    Category,
    Code,
    Failure,
} from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import {
    AssertionVerification,
    AttestationType,
    GetAssertionVerification,
    MakeCredentialVerification,
    SignCountStatus,
    VerificationIssueCode,
    VerificationStatus,
} from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
    AttestationTrustAssessment,
    AttestationTrustStatus,
    AuthenticatorStatus,
} from "../../../../bindings/github.com/go-ctap/mds/model";

import {setAppLocale} from "$lib/i18n";

import LabVerificationRoute from "./LabVerificationRoute.svelte";

describe("Lab verification route", () => {
    beforeEach(() => setAppLocale("en"));
    afterEach(() => cleanup());

    it("renders registration verification and MDS as one semantic route", () => {
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
                    attestationFormat: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
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

        const route = screen.getByRole("list");
        expect(route.tagName).toBe("OL");
        expect(screen.getAllByRole("listitem")).toHaveLength(3);
        expect(screen.getByRole("heading", {name: "Authenticator data"})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Attestation evidence"})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "MDS attestation trust"})).toBeInTheDocument();
        expect(screen.getByText("RP ID hash")).toBeInTheDocument();
        expect(screen.getByText("Credential algorithm")).toBeInTheDocument();
        expect(screen.getAllByRole("heading", {name: "Checks"})).toHaveLength(3);
        expect(screen.getAllByRole("heading", {name: "Details"})).toHaveLength(2);

        const packed = screen.getByText("packed");
        const basic = screen.getByText("basic");
        expect(packed.closest('[data-kind="detail"]')?.querySelector("svg")).toBeNull();
        expect(basic.closest('[data-kind="detail"]')?.querySelector("svg")).toBeNull();

        const certifiedL2 = screen.getByText("FIDO_CERTIFIED_L2");
        const certified = screen.getByText("FIDO_CERTIFIED");
        expect(certifiedL2.closest('[data-slot="badge"]')).toBeInTheDocument();
        expect(certified.closest('[data-slot="badge"]')).toBeInTheDocument();
        expect(certifiedL2.closest('[data-kind="detail"]')?.querySelector("svg")).toBeNull();

        const successfulCheck = screen.getByText("Matches").closest('[data-tone="ok"]');
        expect(successfulCheck?.querySelector(".lab-verification-check-marker"))
            .toBeInTheDocument();
    });

    it("keeps stable issue codes visible inside the affected assertion stage", () => {
        render(LabVerificationRoute, {
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
            onRetryVerification: vi.fn(),
        });

        expect(screen.getByText("cafe")).toBeInTheDocument();
        expect(screen.getByText(
            VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
        )).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Cryptographic proof"}))
            .toBeInTheDocument();
        expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });

    it("uses keyboard-accessible tabs to select an independent assertion route", async () => {
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
        const {rerender} = render(LabVerificationRoute, props);

        const secondTab = screen.getByRole("tab", {name: "Assertion 1"});
        await user.click(secondTab);

        expect(secondTab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByText("second")).toBeVisible();
        expect(screen.getByText(
            VerificationIssueCode.VerificationIssueRPIDHashMismatch,
        )).toBeVisible();

        await rerender(props);
        expect(secondTab).toHaveAttribute("aria-selected", "true");
    });

    it("keeps runtime failures and retry local to their route stage", async () => {
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

        expect(screen.getByText("The operation failed because of an internal error."))
            .toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: "Retry verification"}));
        expect(onRetryVerification).toHaveBeenCalledOnce();
    });

    it("keeps an MDS runtime failure and retry in the trust stage", async () => {
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

        expect(screen.getByText("MDS attestation trust could not be evaluated."))
            .toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: "Retry MDS assessment"}));
        expect(onRetryAttestationTrust).toHaveBeenCalledOnce();
    });
});
