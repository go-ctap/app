import {beforeEach, describe, expect, it} from "vitest";

import {AttestationStatementFormatIdentifier} from "../../bindings/github.com/go-ctap/ctap/attestation";
import {
    AssertionVerification,
    AttestationType,
    GetAssertionVerification,
    MakeCredentialVerification,
    SignCountStatus,
    VerificationIssueCode,
    VerificationStatus,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
    AttestationTrustAssessment,
    AttestationTrustIssueCode,
    AttestationTrustStatus,
    AuthenticatorStatus,
} from "../../bindings/github.com/go-ctap/mds/model";

import {setAppLocale} from "./i18n";
import {
    aggregateVerificationStatus,
    buildAssertionVerificationStages,
    buildAttestationTrustStage,
    buildMakeCredentialVerificationStages,
    buildMissingAssertionStages,
} from "./lab-verification-route";

function makeVerification(
    overrides: Partial<MakeCredentialVerification> = {},
) {
    return new MakeCredentialVerification({
        status: VerificationStatus.VerificationStatusVerified,
        rpIDHashMatches: true,
        userPresenceRequirementMet: true,
        userVerificationRequirementMet: true,
        credentialAlgorithmAllowed: true,
        attestationFormat:
        AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
        attestationType: AttestationType.AttestationTypeBasic,
        signatureValid: true,
        ...overrides,
    });
}

function assertionVerification(
    overrides: Partial<AssertionVerification> = {},
) {
    return new AssertionVerification({
        index: 0,
        credentialIDHex: "cafe",
        status: VerificationStatus.VerificationStatusVerified,
        rpIDHashMatches: true,
        userPresenceRequirementMet: true,
        userVerificationRequirementMet: true,
        credentialAllowed: true,
        signatureValid: true,
        signCount: SignCountStatus.SignCountStatusAdvanced,
        ...overrides,
    });
}

function getStages(
    assertion: AssertionVerification,
    issues: VerificationIssueCode[] = [],
) {
    const result = new GetAssertionVerification({
        status: assertion.status,
        assertions: [assertion],
        issues,
    });
    return buildAssertionVerificationStages(assertion, result);
}

describe("Lab verification route builder", () => {
    beforeEach(() => setAppLocale("en"));

    it("maps packed/basic and none registration evidence to distinct outcomes", () => {
        const packed = buildMakeCredentialVerificationStages(makeVerification());
        expect(packed.map((stage) => stage.status)).toEqual(["verified", "verified"]);
        expect(packed[1].details).toEqual(expect.arrayContaining([
            expect.objectContaining({values: ["packed"], presentation: "code"}),
            expect.objectContaining({values: ["basic"], presentation: "code"}),
        ]));
        expect(packed[1].checks).toEqual(expect.arrayContaining([
            expect.objectContaining({label: "Signature", value: "Valid"}),
        ]));

        const none = buildMakeCredentialVerificationStages(makeVerification({
            attestationFormat:
            AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierNone,
            attestationType: AttestationType.AttestationTypeNone,
            signatureValid: null,
        }));
        expect(none[1]).toMatchObject({
            id: "attestation-evidence",
            status: "not-applicable",
            statusLabel: "Not applicable",
        });
        expect(none[1].checks.some((check) => check.label === "Signature")).toBe(false);
    });

    it("keeps self attestation as verified evidence without inventing MDS trust", () => {
        const stages = buildMakeCredentialVerificationStages(makeVerification({
            attestationType: AttestationType.AttestationTypeSelf,
        }));

        expect(stages[1]).toMatchObject({
            id: "attestation-evidence",
            status: "verified",
        });
        expect(stages[1].details).toContainEqual(
            expect.objectContaining({label: "Attestation", values: ["self"]}),
        );
    });

    it.each([
        [
            VerificationIssueCode.VerificationIssueAttestationFormatUnsupported,
            "unavailable",
        ],
        [
            VerificationIssueCode.VerificationIssueAttestationSignatureInvalid,
            "failed",
        ],
        [
            VerificationIssueCode.VerificationIssueAttestationStatementMalformed,
            "failed",
        ],
    ] as const)("keeps registration evidence issue %s in its stage", (issue, status) => {
        const stages = buildMakeCredentialVerificationStages(makeVerification({
            status: status === "failed"
                ? VerificationStatus.VerificationStatusFailed
                : VerificationStatus.VerificationStatusUnavailable,
            signatureValid: issue === VerificationIssueCode.VerificationIssueAttestationSignatureInvalid
                ? false
                : null,
            issues: [issue],
        }));

        expect(stages[1].status).toBe(status);
        expect(stages[1].issues).toContain(issue);
        expect(stages[0].issues).not.toContain(issue);
    });

    it.each([
        VerificationIssueCode.VerificationIssueResultMismatch,
        VerificationIssueCode.VerificationIssueRPIDHashMismatch,
        VerificationIssueCode.VerificationIssueUserPresenceMissing,
        VerificationIssueCode.VerificationIssueUserVerificationMissing,
        VerificationIssueCode.VerificationIssueCredentialAlgorithmDisallowed,
    ])("keeps authenticator-data issue %s in the first registration stage", (issue) => {
        const stages = buildMakeCredentialVerificationStages(makeVerification({
            status: VerificationStatus.VerificationStatusFailed,
            issues: [issue],
        }));

        expect(stages[0].status).toBe("failed");
        expect(stages[0].issues).toContain(issue);
    });

    it("marks downstream registration evidence unavailable after malformed authData", () => {
        const stages = buildMakeCredentialVerificationStages(makeVerification({
            status: VerificationStatus.VerificationStatusFailed,
            signatureValid: null,
            issues: [VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed],
        }));

        expect(stages[0].status).toBe("failed");
        expect(stages[0].checks).toContainEqual(
            expect.objectContaining({label: "Authenticator data", tone: "bad"}),
        );
        expect(stages[1]).toMatchObject({status: "unavailable", checks: [], details: []});
    });

    it.each([
        [AttestationTrustStatus.AttestationTrustStatusTrusted, "verified"],
        [AttestationTrustStatus.AttestationTrustStatusUntrusted, "failed"],
        [AttestationTrustStatus.AttestationTrustStatusUnavailable, "unavailable"],
        [AttestationTrustStatus.AttestationTrustStatusNotApplicable, "not-applicable"],
    ] as const)("maps MDS status %s to route status %s", (status, routeStatus) => {
        const issue = status === AttestationTrustStatus.AttestationTrustStatusUntrusted
            ? AttestationTrustIssueCode.AttestationTrustIssueCertificateChainUntrusted
            : undefined;
        const stage = buildAttestationTrustStage(new AttestationTrustAssessment({
            status,
            metadataFound: status !== AttestationTrustStatus.AttestationTrustStatusUnavailable,
            certificateChainTrusted:
                status === AttestationTrustStatus.AttestationTrustStatusTrusted
                    ? true
                    : status === AttestationTrustStatus.AttestationTrustStatusUntrusted ? false : null,
            authenticatorStatuses: [AuthenticatorStatus.AuthenticatorStatusFIDOCertified],
            issues: issue ? [issue] : [],
        }));

        expect(stage.status).toBe(routeStatus);
        expect(stage.details).toContainEqual(
            expect.objectContaining({
                label: "Authenticator statuses",
                values: [AuthenticatorStatus.AuthenticatorStatusFIDOCertified],
                presentation: "tags",
            }),
        );
        if (issue) expect(stage.issues).toContain(issue);
    });

    it.each([
        [
            VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
            "unavailable",
        ],
        [
            VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous,
            "unavailable",
        ],
        [
            VerificationIssueCode.VerificationIssueVerificationKeyMalformed,
            "unavailable",
        ],
        [
            VerificationIssueCode.VerificationIssueSignatureMalformed,
            "failed",
        ],
        [
            VerificationIssueCode.VerificationIssueAssertionSignatureInvalid,
            "failed",
        ],
    ] as const)("maps assertion proof issue %s to the cryptographic stage", (issue, status) => {
        const assertion = assertionVerification({
            status: status === "failed"
                ? VerificationStatus.VerificationStatusFailed
                : VerificationStatus.VerificationStatusUnavailable,
            signatureValid: issue === VerificationIssueCode.VerificationIssueAssertionSignatureInvalid
                ? false
                : null,
            signCount: SignCountStatus.SignCountStatusNotChecked,
            issues: [issue],
        });
        const stages = getStages(assertion);

        expect(stages[1].status).toBe(status);
        expect(stages[1].issues).toContain(issue);
        expect(stages[0].issues).not.toContain(issue);
    });

    it("separates a resolved verification record from its malformed COSE key", () => {
        const stages = getStages(assertionVerification({
            status: VerificationStatus.VerificationStatusUnavailable,
            signatureValid: null,
            issues: [VerificationIssueCode.VerificationIssueVerificationKeyMalformed],
        }));

        expect(stages[1].checks).toEqual(expect.arrayContaining([
            expect.objectContaining({
                label: "Verification material",
                value: "Ready",
                tone: "ok",
            }),
            expect.objectContaining({
                label: "Public key COSE",
                value: "Invalid",
                tone: "bad",
            }),
        ]));
    });

    it.each([
        VerificationIssueCode.VerificationIssueCredentialDisallowed,
        VerificationIssueCode.VerificationIssueRPIDHashMismatch,
        VerificationIssueCode.VerificationIssueUserPresenceMissing,
        VerificationIssueCode.VerificationIssueUserVerificationMissing,
        VerificationIssueCode.VerificationIssueAttestedCredentialDataUnexpected,
    ])("keeps assertion data issue %s in the first stage", (issue) => {
        const stages = getStages(assertionVerification({
            status: VerificationStatus.VerificationStatusFailed,
            issues: [issue],
        }));

        expect(stages[0].status).toBe("failed");
        expect(stages[0].issues).toContain(issue);
    });

    it("keeps top-level assertion count problems in the first stage", () => {
        const issue = VerificationIssueCode.VerificationIssueAssertionCountUnexpected;
        const assertion = assertionVerification();
        const stages = getStages(assertion, [issue]);

        expect(stages[0].issues).toContain(issue);
        expect(stages[0].status).toBe("failed");
    });

    it.each([
        [SignCountStatus.SignCountStatusAdvanced, "verified"],
        [SignCountStatus.SignCountStatusUnsupported, "not-applicable"],
        [SignCountStatus.SignCountStatusNotChecked, "neutral"],
        [SignCountStatus.SignCountStatusNotAdvanced, "warning"],
    ] as const)("maps signCount status %s without failing signature verification", (signCount, status) => {
        const warning = signCount === SignCountStatus.SignCountStatusNotAdvanced
            ? [VerificationIssueCode.VerificationWarningSignCountNotAdvanced]
            : [];
        const stages = getStages(assertionVerification({signCount, warnings: warning}));

        expect(stages[2].status).toBe(status);
        expect(stages[1].status).toBe("verified");
        if (
            signCount === SignCountStatus.SignCountStatusUnsupported
            || signCount === SignCountStatus.SignCountStatusNotChecked
        ) {
            expect(stages[2].checks).toEqual([]);
            expect(stages[2].details).toContainEqual(
                expect.objectContaining({label: "Sign count"}),
            );
        } else {
            expect(stages[2].checks).toContainEqual(
                expect.objectContaining({label: "Sign count"}),
            );
            expect(stages[2].details).toEqual([]);
        }
        expect(aggregateVerificationStatus(stages)).toBe(
            status === "warning" ? "warning" : "verified",
        );
    });

    it("builds a failed first stage when no assertion is available", () => {
        const issue = VerificationIssueCode.VerificationIssueAssertionMissing;
        const stages = buildMissingAssertionStages(new GetAssertionVerification({
            status: VerificationStatus.VerificationStatusFailed,
            assertions: [],
            issues: [issue],
        }));

        expect(stages[0]).toMatchObject({status: "failed", issues: [issue]});
        expect(stages[0].details).toContainEqual(
            expect.objectContaining({label: "Assertions received", values: ["0"]}),
        );
    });
});
