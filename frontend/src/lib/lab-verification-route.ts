import {
    AttestationType,
    SignCountStatus,
    VerificationIssueCode,
    type AssertionVerification,
    type GetAssertionVerification,
    type MakeCredentialVerification,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
    AttestationTrustStatus,
    type AttestationTrustAssessment,
} from "../../bindings/github.com/go-ctap/mds/model";

import {m} from "../paraglide/messages.js";

export type LabVerificationStageStatus =
    | "verified"
    | "failed"
    | "unavailable"
    | "warning"
    | "not-applicable"
    | "neutral"
    | "loading"
    | "pending";

export type LabVerificationCheckTone = "ok" | "bad" | "warning" | "neutral";

export type LabVerificationCheck = {
    label: string;
    value: string;
    tone: LabVerificationCheckTone;
};

export type LabVerificationDetail = {
    label: string;
    values: string[];
    presentation: "text" | "code" | "tags";
};

export type LabVerificationStage = {
    id: string;
    title: string;
    description: string;
    status: LabVerificationStageStatus;
    statusLabel: string;
    checks: LabVerificationCheck[];
    details: LabVerificationDetail[];
    issues: string[];
    warnings: string[];
};

const unavailableIssues = new Set<VerificationIssueCode>([
    VerificationIssueCode.VerificationIssueCredentialAlgorithmUnsupported,
    VerificationIssueCode.VerificationIssueAttestationFormatUnsupported,
    VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
    VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous,
    VerificationIssueCode.VerificationIssueVerificationKeyMalformed,
]);

const makeEvidenceIssues = new Set<VerificationIssueCode>([
    VerificationIssueCode.VerificationIssueCredentialAlgorithmUnsupported,
    VerificationIssueCode.VerificationIssueAttestationObjectMalformed,
    VerificationIssueCode.VerificationIssueAttestationObjectMismatch,
    VerificationIssueCode.VerificationIssueAttestationStatementMalformed,
    VerificationIssueCode.VerificationIssueAttestationFormatUnsupported,
    VerificationIssueCode.VerificationIssueAttestationSignatureInvalid,
]);

const makeEvidenceBlockers = new Set<VerificationIssueCode>([
    VerificationIssueCode.VerificationIssueResultMalformed,
    VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed,
    VerificationIssueCode.VerificationIssueAttestedCredentialDataMissing,
    VerificationIssueCode.VerificationIssueCredentialKeyMalformed,
]);

const assertionProofIssues = new Set<VerificationIssueCode>([
    VerificationIssueCode.VerificationIssueCredentialAlgorithmUnsupported,
    VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
    VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous,
    VerificationIssueCode.VerificationIssueVerificationKeyMalformed,
    VerificationIssueCode.VerificationIssueSignatureMalformed,
    VerificationIssueCode.VerificationIssueAssertionSignatureInvalid,
]);

const assertionProofBlockers = new Set<VerificationIssueCode>([
    VerificationIssueCode.VerificationIssueResultMalformed,
    VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed,
]);

function presentIssues<T extends string>(issues: T[] | null | undefined): T[] {
    return [...new Set((issues ?? []).filter(Boolean))];
}

function statusLabel(status: LabVerificationStageStatus) {
    switch (status) {
        case "verified":
            return m.lab_verification_verified();
        case "failed":
            return m.lab_verification_failed();
        case "unavailable":
            return m.lab_verification_unavailable();
        case "warning":
            return m.lab_verification_warning();
        case "not-applicable":
            return m.lab_verification_not_applicable();
        case "loading":
            return m.lab_verification_in_progress();
        case "pending":
            return m.lab_verification_pending();
        case "neutral":
            return m.lab_verification_not_checked();
    }
}

function statusForIssues(
    issues: VerificationIssueCode[],
    warnings: VerificationIssueCode[] = [],
): LabVerificationStageStatus {
    if (issues.some((issue) => !unavailableIssues.has(issue))) return "failed";
    if (issues.length) return "unavailable";
    if (warnings.length) return "warning";
    return "verified";
}

function booleanFact(
    label: string,
    value: boolean,
    positive: string,
    negative: string,
): LabVerificationCheck {
    return {
        label,
        value: value ? positive : negative,
        tone: value ? "ok" : "bad",
    };
}

function detail(
    label: string,
    value: string,
    presentation: LabVerificationDetail["presentation"] = "text",
): LabVerificationDetail {
    return {label, values: [value], presentation};
}

function tagsDetail(label: string, values: string[]): LabVerificationDetail {
    return {label, values, presentation: "tags"};
}

function signatureFact(value: boolean | null | undefined): LabVerificationCheck {
    if (value === true) {
        return {label: m.lab_signature(), value: m.lab_verification_valid(), tone: "ok"};
    }
    if (value === false) {
        return {label: m.lab_signature(), value: m.lab_verification_invalid(), tone: "bad"};
    }
    return {
        label: m.lab_signature(),
        value: m.lab_verification_not_applicable(),
        tone: "neutral",
    };
}

function hasIssue(issues: VerificationIssueCode[], issue: VerificationIssueCode) {
    return issues.includes(issue);
}

function resultIntegrityFact(issues: VerificationIssueCode[]): LabVerificationCheck {
    const mismatch = hasIssue(issues, VerificationIssueCode.VerificationIssueResultMismatch)
        || hasIssue(issues, VerificationIssueCode.VerificationIssueResultRPIDMismatch);
    return booleanFact(
        m.lab_verification_result_integrity(),
        !mismatch,
        m.lab_verification_consistent(),
        m.lab_verification_inconsistent(),
    );
}

function authenticatorDataFact(issues: VerificationIssueCode[]): LabVerificationCheck {
    const valid = !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueResultMalformed,
    ) && !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed,
    );
    return booleanFact(
        m.lab_authenticator_data(),
        valid,
        m.lab_verification_valid(),
        m.lab_verification_invalid(),
    );
}

export function buildMakeCredentialVerificationStages(
    verification: MakeCredentialVerification,
): LabVerificationStage[] {
    const issues = presentIssues(verification.issues);
    const evidenceIssues = issues.filter((issue) => makeEvidenceIssues.has(issue));
    const authenticatorIssues = issues.filter((issue) => !makeEvidenceIssues.has(issue));
    const authDataParsed = !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueResultMalformed,
    ) && !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed,
    );
    const attestedDataAvailable = authDataParsed && !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueAttestedCredentialDataMissing,
    );

    const authenticatorChecks: LabVerificationCheck[] = [authenticatorDataFact(issues)];
    if (!hasIssue(issues, VerificationIssueCode.VerificationIssueResultMalformed)) {
        authenticatorChecks.push(resultIntegrityFact(issues));
    }
    if (authDataParsed) {
        authenticatorChecks.push(
            booleanFact(
                m.lab_verification_rp_id_hash(),
                verification.rpIDHashMatches,
                m.lab_verification_matches(),
                m.lab_verification_does_not_match(),
            ),
            booleanFact(
                m.lab_user_presence(),
                verification.userPresenceRequirementMet,
                m.lab_verification_requirement_met(),
                m.lab_verification_not_met(),
            ),
            booleanFact(
                m.lab_user_verification(),
                verification.userVerificationRequirementMet,
                m.lab_verification_requirement_met(),
                m.lab_verification_not_met(),
            ),
            booleanFact(
                m.lab_verification_attested_data(),
                attestedDataAvailable,
                m.lab_verification_present(),
                m.lab_verification_missing(),
            ),
        );
    }
    if (attestedDataAvailable && !hasIssue(
        issues,
        VerificationIssueCode.VerificationIssueCredentialKeyMalformed,
    )) {
        authenticatorChecks.push(booleanFact(
            m.lab_verification_credential_algorithm(),
            verification.credentialAlgorithmAllowed,
            m.lab_verification_allowed(),
            m.lab_verification_disallowed(),
        ));
    }

    const noneAttestation = verification.attestationType === AttestationType.AttestationTypeNone;
    const evidenceBlocked = issues.some((issue) => makeEvidenceBlockers.has(issue));
    const evidenceStatus: LabVerificationStageStatus = evidenceBlocked
        ? "unavailable"
        : noneAttestation && !evidenceIssues.length
            ? "not-applicable"
            : statusForIssues(evidenceIssues);
    const evidenceChecks: LabVerificationCheck[] = [];
    const evidenceDetails: LabVerificationDetail[] = [];
    const objectMalformed = hasIssue(
        evidenceIssues,
        VerificationIssueCode.VerificationIssueAttestationObjectMalformed,
    );
    const statementMalformed = hasIssue(
        evidenceIssues,
        VerificationIssueCode.VerificationIssueAttestationStatementMalformed,
    );
    if (!evidenceBlocked) {
        evidenceDetails.push(
            detail(
                m.lab_format(),
                verification.attestationFormat || m.lab_not_reported(),
                "code",
            ),
        );
    }
    if (!evidenceBlocked && !objectMalformed && !statementMalformed) {
        evidenceDetails.push(
            detail(
                m.lab_attestation(),
                verification.attestationType || m.lab_not_reported(),
                "code",
            ),
        );
    }
    if (!evidenceBlocked && verification.signatureValid !== null
        && verification.signatureValid !== undefined) {
        evidenceChecks.push(signatureFact(verification.signatureValid));
    }

    return [
        {
            id: "authenticator-data",
            title: m.lab_verification_authenticator_data(),
            description: m.lab_verification_authenticator_data_description(),
            status: statusForIssues(authenticatorIssues),
            statusLabel: statusLabel(statusForIssues(authenticatorIssues)),
            checks: authenticatorChecks,
            details: [],
            issues: authenticatorIssues,
            warnings: [],
        },
        {
            id: "attestation-evidence",
            title: m.lab_verification_attestation_evidence(),
            description: m.lab_verification_attestation_evidence_description(),
            status: evidenceStatus,
            statusLabel: statusLabel(evidenceStatus),
            checks: evidenceChecks,
            details: evidenceDetails,
            issues: evidenceIssues,
            warnings: [],
        },
    ];
}

function verificationMaterialFact(issues: VerificationIssueCode[]): LabVerificationCheck {
    if (hasIssue(issues, VerificationIssueCode.VerificationIssueVerificationMaterialMissing)) {
        return {
            label: m.lab_verification_material(),
            value: m.lab_verification_missing(),
            tone: "neutral",
        };
    }
    if (hasIssue(issues, VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous)) {
        return {
            label: m.lab_verification_material(),
            value: m.lab_verification_ambiguous(),
            tone: "neutral",
        };
    }
    return {label: m.lab_verification_material(), value: m.lab_verification_ready(), tone: "ok"};
}

function verificationKeyFact(issues: VerificationIssueCode[]): LabVerificationCheck | null {
    if (
        hasIssue(issues, VerificationIssueCode.VerificationIssueVerificationMaterialMissing)
        || hasIssue(issues, VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous)
    ) {
        return null;
    }
    if (hasIssue(issues, VerificationIssueCode.VerificationIssueVerificationKeyMalformed)) {
        return {
            label: m.lab_public_key_cose(),
            value: m.lab_verification_invalid(),
            tone: "bad",
        };
    }
    return {
        label: m.lab_public_key_cose(),
        value: m.lab_verification_valid(),
        tone: "ok",
    };
}

function signCountStage(
    verification: AssertionVerification,
): LabVerificationStage {
    const warnings = presentIssues(verification.warnings);
    let status: LabVerificationStageStatus;
    let label: string;
    switch (verification.signCount) {
        case SignCountStatus.SignCountStatusAdvanced:
            status = "verified";
            label = m.lab_verification_advanced();
            break;
        case SignCountStatus.SignCountStatusNotAdvanced:
            status = "warning";
            label = m.lab_verification_not_advanced();
            break;
        case SignCountStatus.SignCountStatusUnsupported:
            status = "not-applicable";
            label = m.lab_verification_unsupported();
            break;
        case SignCountStatus.SignCountStatusNotChecked:
        default:
            status = "neutral";
            label = m.lab_verification_not_checked();
            break;
    }

    return {
        id: "signature-counter",
        title: m.lab_verification_signature_counter(),
        description: m.lab_verification_signature_counter_description(),
        status,
        statusLabel: label,
        checks: status === "warning" || status === "verified"
            ? [{
                label: m.lab_verification_sign_count(),
                value: label,
                tone: status === "warning" ? "warning" : "ok",
            }]
            : [],
        details: status === "warning" || status === "verified"
            ? []
            : [detail(m.lab_verification_sign_count(), label)],
        issues: [],
        warnings,
    };
}

export function buildAssertionVerificationStages(
    verification: AssertionVerification,
    result: GetAssertionVerification,
): LabVerificationStage[] {
    const assertionIssues = presentIssues(verification.issues);
    const proofIssues = assertionIssues.filter((issue) => assertionProofIssues.has(issue));
    const authenticatorIssues = presentIssues([
        ...(result.issues ?? []),
        ...assertionIssues.filter((issue) => !assertionProofIssues.has(issue)),
    ]);
    const authDataParsed = !hasIssue(
        assertionIssues,
        VerificationIssueCode.VerificationIssueResultMalformed,
    ) && !hasIssue(
        assertionIssues,
        VerificationIssueCode.VerificationIssueAuthenticatorDataMalformed,
    );

    const authenticatorChecks: LabVerificationCheck[] = [
        authenticatorDataFact(assertionIssues),
        booleanFact(
            m.lab_verification_credential_allowed(),
            verification.credentialAllowed,
            m.lab_verification_allowed(),
            m.lab_verification_disallowed(),
        ),
    ];
    if (!hasIssue(assertionIssues, VerificationIssueCode.VerificationIssueResultMalformed)) {
        authenticatorChecks.push(resultIntegrityFact(authenticatorIssues));
    }
    if (authDataParsed) {
        authenticatorChecks.push(
            booleanFact(
                m.lab_verification_rp_id_hash(),
                verification.rpIDHashMatches,
                m.lab_verification_matches(),
                m.lab_verification_does_not_match(),
            ),
            booleanFact(
                m.lab_user_presence(),
                verification.userPresenceRequirementMet,
                m.lab_verification_requirement_met(),
                m.lab_verification_not_met(),
            ),
            booleanFact(
                m.lab_user_verification(),
                verification.userVerificationRequirementMet,
                m.lab_verification_requirement_met(),
                m.lab_verification_not_met(),
            ),
            booleanFact(
                m.lab_verification_attested_data(),
                !hasIssue(
                    assertionIssues,
                    VerificationIssueCode.VerificationIssueAttestedCredentialDataUnexpected,
                ),
                m.lab_verification_absent_as_expected(),
                m.lab_verification_unexpected(),
            ),
        );
    }

    const signature = signatureFact(verification.signatureValid);
    if (verification.signatureValid === null || verification.signatureValid === undefined) {
        signature.value = m.lab_verification_not_checked();
    }
    const proofBlocked = assertionIssues.some((issue) => assertionProofBlockers.has(issue));
    const proofStatus = proofBlocked ? "unavailable" : statusForIssues(proofIssues);
    const proofChecks: LabVerificationCheck[] = proofBlocked
        ? []
        : [verificationMaterialFact(proofIssues)];
    const proofDetails: LabVerificationDetail[] = [];
    const keyFact = verificationKeyFact(proofIssues);
    if (!proofBlocked && keyFact) proofChecks.push(keyFact);
    if (!proofBlocked && hasIssue(
        proofIssues,
        VerificationIssueCode.VerificationIssueSignatureMalformed,
    )) {
        proofChecks.push({
            label: m.lab_signature(),
            value: m.lab_verification_invalid(),
            tone: "bad",
        });
    } else if (!proofBlocked && verification.signatureValid !== null
        && verification.signatureValid !== undefined) {
        proofDetails.push(
            detail(
                m.lab_verification_signed_data(),
                m.lab_verification_signed_data_value(),
                "code",
            ),
        );
        proofChecks.push(signature);
    }
    const counterStage = signCountStage(verification);
    if (proofBlocked || hasIssue(
        proofIssues,
        VerificationIssueCode.VerificationIssueVerificationMaterialMissing,
    ) || hasIssue(
        proofIssues,
        VerificationIssueCode.VerificationIssueVerificationMaterialAmbiguous,
    )) {
        counterStage.status = "unavailable";
        counterStage.statusLabel = statusLabel("unavailable");
        counterStage.checks = [];
        counterStage.details = [];
        counterStage.warnings = [];
    }

    return [
        {
            id: "credential-authenticator-data",
            title: m.lab_verification_credential_authenticator_data(),
            description: m.lab_verification_credential_authenticator_data_description(),
            status: statusForIssues(authenticatorIssues),
            statusLabel: statusLabel(statusForIssues(authenticatorIssues)),
            checks: authenticatorChecks,
            details: [
                detail(
                    m.lab_verification_assertions_received(),
                    String(result.assertions.length),
                ),
            ],
            issues: authenticatorIssues,
            warnings: [],
        },
        {
            id: "cryptographic-proof",
            title: m.lab_verification_cryptographic_proof(),
            description: m.lab_verification_cryptographic_proof_description(),
            status: proofStatus,
            statusLabel: statusLabel(proofStatus),
            checks: proofChecks,
            details: proofDetails,
            issues: proofIssues,
            warnings: [],
        },
        counterStage,
    ];
}

export function buildMissingAssertionStages(
    verification: GetAssertionVerification,
): LabVerificationStage[] {
    const issues = presentIssues(verification.issues);
    const firstStatus = statusForIssues(issues);
    return [
        {
            id: "credential-authenticator-data",
            title: m.lab_verification_credential_authenticator_data(),
            description: m.lab_verification_credential_authenticator_data_description(),
            status: firstStatus,
            statusLabel: statusLabel(firstStatus),
            checks: [],
            details: [
                detail(
                    m.lab_verification_assertions_received(),
                    String(verification.assertions.length),
                ),
            ],
            issues,
            warnings: [],
        },
        pendingStage(
            "cryptographic-proof",
            m.lab_verification_cryptographic_proof(),
            m.lab_verification_cryptographic_proof_description(),
        ),
        pendingStage(
            "signature-counter",
            m.lab_verification_signature_counter(),
            m.lab_verification_signature_counter_description(),
        ),
    ];
}

export function buildAttestationTrustStage(
    assessment: AttestationTrustAssessment,
): LabVerificationStage {
    let status: LabVerificationStageStatus;
    let label: string;
    switch (assessment.status) {
        case AttestationTrustStatus.AttestationTrustStatusTrusted:
            status = "verified";
            label = m.lab_attestation_trust_trusted();
            break;
        case AttestationTrustStatus.AttestationTrustStatusUntrusted:
            status = "failed";
            label = m.lab_attestation_trust_untrusted();
            break;
        case AttestationTrustStatus.AttestationTrustStatusNotApplicable:
            status = "not-applicable";
            label = m.lab_attestation_trust_not_applicable();
            break;
        case AttestationTrustStatus.AttestationTrustStatusUnavailable:
        default:
            status = "unavailable";
            label = m.lab_verification_unavailable();
            break;
    }

    const chainValue = assessment.certificateChainTrusted === true
        ? m.lab_attestation_trust_trusted()
        : assessment.certificateChainTrusted === false
            ? m.lab_attestation_trust_untrusted()
            : assessment.status === AttestationTrustStatus.AttestationTrustStatusNotApplicable
                ? m.lab_attestation_trust_not_applicable()
                : m.lab_verification_not_checked();
    const checks: LabVerificationCheck[] = [
        booleanFact(
            m.lab_attestation_trust_metadata(),
            assessment.metadataFound,
            m.lab_attestation_trust_found(),
            m.lab_attestation_trust_not_found(),
        ),
        {
            label: m.lab_attestation_trust_chain(),
            value: chainValue,
            tone: assessment.certificateChainTrusted === true
                ? "ok"
                : assessment.certificateChainTrusted === false ? "bad" : "neutral",
        },
    ];
    const details: LabVerificationDetail[] = [];
    if (assessment.authenticatorStatuses?.length) {
        details.push(tagsDetail(
            m.lab_attestation_trust_statuses(),
            assessment.authenticatorStatuses,
        ));
    }

    return {
        id: "attestation-trust",
        title: m.lab_attestation_trust_title(),
        description: m.lab_attestation_trust_description(),
        status,
        statusLabel: label,
        checks,
        details,
        issues: presentIssues(assessment.issues),
        warnings: [],
    };
}

export function pendingStage(
    id: string,
    title: string,
    description: string,
    loading = false,
): LabVerificationStage {
    const status: LabVerificationStageStatus = loading ? "loading" : "pending";
    return {
        id,
        title,
        description,
        status,
        statusLabel: statusLabel(status),
        checks: [],
        details: [],
        issues: [],
        warnings: [],
    };
}

export function aggregateVerificationStatus(
    stages: LabVerificationStage[],
): LabVerificationStageStatus {
    const statuses = stages.map((stage) => stage.status);
    if (statuses.includes("failed")) return "failed";
    if (statuses.includes("unavailable")) return "unavailable";
    if (statuses.includes("warning")) return "warning";
    if (statuses.includes("loading")) return "loading";
    if (statuses.includes("pending")) return "pending";
    if (statuses.includes("verified")) return "verified";
    if (statuses.includes("not-applicable")) return "not-applicable";
    return "neutral";
}

export function verificationStatusLabel(status: LabVerificationStageStatus) {
    return statusLabel(status);
}
