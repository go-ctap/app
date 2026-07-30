import {
  EvidenceGapID,
  EvidenceState,
  ExpectationKind,
  ExpectationQuantifier,
  RuleID,
  type Evidence,
  type Expectation,
  type Finding,
  type Inconclusive,
  type Profile,
} from "../../bindings/github.com/go-ctap/kit/model/conformance";

import { m } from "../paraglide/messages.js";
import type {
  OverviewConformanceAssessment,
  OverviewMDSState,
  OverviewRowStatus,
} from "$lib/overview-types.js";

export { m };

export const value = {
  absent: () => m.matrix_value_absent(),
  available: () => m.state_available(),
  availableByDefault: () => m.matrix_value_available_by_default(),
  bytes: (count: number) => m.bytes_count({ count }),
  capacityNotReported: () => m.capacity_not_reported(),
  certificationsNotReported: () => m.matrix_value_certifications_not_reported(),
  codePoints: (count: number) => m.matrix_value_code_points({ count }),
  configured: () => m.status_configured(),
  defaultBytes: (count: number) => m.matrix_value_default_bytes({ count }),
  defaultCodePoints: (count: number) => m.matrix_value_default_code_points({ count }),
  defaultFalse: () => m.matrix_value_default_false(),
  defaultTrue: () => m.matrix_value_default_true(),
  emptyList: () => m.matrix_value_empty_list(),
  extensionsNotReported: () => m.matrix_value_extensions_not_reported(),
  falseOrAbsent: () => m.matrix_value_false_or_absent(),
  level: (item: string) => m.matrix_value_level({ value: item }),
  noneImpliedNoFormatsReported: () => m.matrix_value_none_implied_no_formats_reported(),
  notAvailableThroughClientPinToken: () => m.matrix_value_not_available_through_clientpin_token(),
  notConfigured: () => m.status_not_configured(),
  notListed: () => m.not_listed(),
  notReported: () => m.not_reported(),
  notRequired: () => m.matrix_value_not_required(),
  notRequiredByDefault: () => m.matrix_value_not_required_by_default(),
  pinChangeRequired: () => m.matrix_value_pin_change_required(),
  pinNotSet: () => m.pin_not_set(),
  pinSet: () => m.pin_set(),
  reportedBytes: (count: number) => m.reported_bytes({ count }),
  reportedChars: (count: number) => m.reported_chars({ count }),
  stateUnknown: () => m.state_unknown(),
  uvMayBeSkipped: () => m.matrix_value_uv_may_be_skipped(),
  uvRequired: () => m.matrix_value_uv_required(),
  uvRequiredByDefault: () => m.matrix_value_uv_required_by_default(),
};

type ConformanceRuleID = Exclude<RuleID, RuleID.$zero>;

type ConformanceRuleMessages = {
  name: (profile: Profile) => string;
  description: (profile: Profile) => string;
};

function ruleMessages(name: () => string, description: () => string): ConformanceRuleMessages {
  return { name: () => name(), description: () => description() };
}

const CTAP_RULE_MESSAGES = {
  [RuleID.RuleVersionsRequired]: ruleMessages(
    m.overview_ctap_warning_versions_required_name,
    m.overview_ctap_warning_versions_required_description,
  ),
  [RuleID.RulePinUVAuthProtocolsNonEmpty]: ruleMessages(
    m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_name,
    m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_description,
  ),
  [RuleID.RulePinUVAuthProtocolsUnique]: ruleMessages(
    m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_name,
    m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_description,
  ),
  [RuleID.RuleTransportsNonEmpty]: ruleMessages(
    m.overview_ctap_warning_transports_list_empty_name,
    m.overview_ctap_warning_transports_list_empty_description,
  ),
  [RuleID.RuleTransportsUnique]: ruleMessages(
    m.overview_ctap_warning_transports_list_duplicate_name,
    m.overview_ctap_warning_transports_list_duplicate_description,
  ),
  [RuleID.RuleAlgorithmsNonEmpty]: ruleMessages(
    m.overview_ctap_warning_algorithms_list_empty_name,
    m.overview_ctap_warning_algorithms_list_empty_description,
  ),
  [RuleID.RuleAlgorithmsUnique]: ruleMessages(
    m.overview_ctap_warning_algorithms_list_duplicate_name,
    m.overview_ctap_warning_algorithms_list_duplicate_description,
  ),
  [RuleID.RuleTransportsForResetNonEmpty]: ruleMessages(
    m.overview_ctap_warning_transports_for_reset_list_empty_name,
    m.overview_ctap_warning_transports_for_reset_list_empty_description,
  ),
  [RuleID.RuleTransportsForResetUnique]: ruleMessages(
    m.overview_ctap_warning_transports_for_reset_list_duplicate_name,
    m.overview_ctap_warning_transports_for_reset_list_duplicate_description,
  ),
  [RuleID.RuleAttestationFormatsNonEmpty]: ruleMessages(
    m.overview_ctap_warning_attestation_formats_list_empty_name,
    m.overview_ctap_warning_attestation_formats_list_empty_description,
  ),
  [RuleID.RuleAttestationFormatsUnique]: ruleMessages(
    m.overview_ctap_warning_attestation_formats_list_duplicate_name,
    m.overview_ctap_warning_attestation_formats_list_duplicate_description,
  ),
  [RuleID.RuleAttestationFormatsNoneOmitted]: ruleMessages(
    m.overview_ctap_warning_attestation_formats_none_name,
    m.overview_ctap_warning_attestation_formats_none_description,
  ),
  [RuleID.RuleCertificationLevelRange]: ruleMessages(
    m.overview_conformance_certification_level_name,
    m.overview_conformance_certification_level_description,
  ),
  [RuleID.RuleProfileHMACSecretRequired]: {
    name: (profile) => m.overview_ctap_warning_ctap23_hmac_secret_name({ profile }),
    description: (profile) => m.overview_ctap_warning_ctap23_hmac_secret_description({ profile }),
  },
  [RuleID.RuleProfileRKUVCapabilityRequired]: {
    name: () => m.overview_ctap_warning_ctap23_rk_uv_state_name(),
    description: (profile) => m.overview_ctap_warning_ctap23_rk_uv_state_description({ profile }),
  },
  [RuleID.RuleProfileRKCredentialManagementRequired]: {
    name: () => m.overview_ctap_warning_ctap23_rk_cred_mgmt_name(),
    description: (profile) => m.overview_ctap_warning_ctap23_rk_cred_mgmt_description({ profile }),
  },
  [RuleID.RuleProfileCredentialProtectionRequired]: {
    name: () => m.overview_ctap_warning_ctap23_cred_protect_name(),
    description: (profile) => m.overview_ctap_warning_ctap23_cred_protect_description({ profile }),
  },
  [RuleID.RuleProfilePinUVAuthTokenRequired]: {
    name: () => m.overview_ctap_warning_ctap23_pin_uv_auth_token_name(),
    description: (profile) =>
      m.overview_ctap_warning_ctap23_pin_uv_auth_token_description({ profile }),
  },
  [RuleID.RuleProfilePinUVProtocolTwoRequired]: {
    name: () => m.overview_ctap_warning_ctap23_pin_protocol_two_name(),
    description: (profile) =>
      m.overview_ctap_warning_ctap23_pin_protocol_two_description({ profile }),
  },
  [RuleID.RuleCredBlobRequiresCredProtect]: ruleMessages(
    m.overview_ctap_warning_credblob_requires_credprotect_name,
    m.overview_ctap_warning_credblob_requires_credprotect_description,
  ),
  [RuleID.RuleCredBlobRequiresMaxLength]: ruleMessages(
    m.overview_ctap_warning_credblob_requires_limit_name,
    m.overview_ctap_warning_credblob_requires_limit_description,
  ),
  [RuleID.RuleCredBlobMaxLengthMinimum]: ruleMessages(
    m.overview_ctap_warning_credblob_limit_invalid_name,
    m.overview_ctap_warning_credblob_limit_invalid_description,
  ),
  [RuleID.RuleCredBlobMaxLengthRequiresExtension]: ruleMessages(
    m.overview_ctap_warning_credblob_limit_without_extension_name,
    m.overview_ctap_warning_credblob_limit_without_extension_description,
  ),
  [RuleID.RuleLargeBlobModesMutuallyExclusive]: ruleMessages(
    m.overview_ctap_warning_largeblob_mode_conflict_name,
    m.overview_ctap_warning_largeblob_mode_conflict_description,
  ),
  [RuleID.RuleLargeBlobExtensionsMutuallyExclusive]: ruleMessages(
    m.overview_ctap_warning_largeblob_extensions_conflict_name,
    m.overview_ctap_warning_largeblob_extensions_conflict_description,
  ),
  [RuleID.RuleLargeBlobKeyRequiresCommand]: ruleMessages(
    m.overview_ctap_warning_largeblob_key_incomplete_name,
    m.overview_ctap_warning_largeblob_key_incomplete_description,
  ),
  [RuleID.RuleLargeBlobsRequiresCapacity]: ruleMessages(
    m.overview_ctap_warning_largeblobs_requires_limit_name,
    m.overview_ctap_warning_largeblobs_requires_limit_description,
  ),
  [RuleID.RuleLargeBlobsCapacityMinimum]: ruleMessages(
    m.overview_ctap_warning_largeblobs_limit_invalid_name,
    m.overview_ctap_warning_largeblobs_limit_invalid_description,
  ),
  [RuleID.RuleLargeBlobsCapacityRequiresCommand]: ruleMessages(
    m.overview_ctap_warning_largeblobs_limit_without_command_name,
    m.overview_ctap_warning_largeblobs_limit_without_command_description,
  ),
  [RuleID.RuleSetMinPINRequiresPINCapability]: ruleMessages(
    m.overview_ctap_warning_set_min_pin_without_uv_name,
    m.overview_ctap_warning_set_min_pin_without_uv_description,
  ),
  [RuleID.RuleSetMinPINSupportConsistency]: ruleMessages(
    m.overview_conformance_set_min_pin_support_name,
    m.overview_conformance_set_min_pin_support_description,
  ),
  [RuleID.RuleAuthenticatorConfigSupportConsistency]: ruleMessages(
    m.overview_conformance_authenticator_config_support_name,
    m.overview_conformance_authenticator_config_support_description,
  ),
  [RuleID.RuleConfigCommandRequired]: ruleMessages(
    m.overview_conformance_config_command_required_name,
    m.overview_conformance_config_command_required_description,
  ),
  [RuleID.RuleConfigCommandPrerequisite]: ruleMessages(
    m.overview_conformance_config_command_prerequisite_name,
    m.overview_conformance_config_command_prerequisite_description,
  ),
  [RuleID.RuleMinPINLengthMinimum]: ruleMessages(
    m.overview_ctap_warning_min_pin_length_invalid_name,
    m.overview_ctap_warning_min_pin_length_invalid_description,
  ),
  [RuleID.RuleMinPINLengthRequiresClientPIN]: ruleMessages(
    m.overview_ctap_warning_min_pin_without_client_pin_name,
    m.overview_ctap_warning_min_pin_without_client_pin_description,
  ),
  [RuleID.RuleClientPINRequiresMinPINLength]: ruleMessages(
    m.overview_ctap_warning_min_pin_missing_name,
    m.overview_ctap_warning_min_pin_missing_description,
  ),
  [RuleID.RuleMaxPINLengthMinimum]: ruleMessages(
    m.overview_ctap_warning_max_pin_length_invalid_name,
    m.overview_ctap_warning_max_pin_length_invalid_description,
  ),
  [RuleID.RuleMaxPINLengthRequiresClientPIN]: ruleMessages(
    m.overview_ctap_warning_max_pin_without_client_pin_name,
    m.overview_ctap_warning_max_pin_without_client_pin_description,
  ),
  [RuleID.RulePinComplexityRequiresClientPIN]: ruleMessages(
    m.overview_ctap_warning_pin_complexity_without_client_pin_name,
    m.overview_ctap_warning_pin_complexity_without_client_pin_description,
  ),
  [RuleID.RuleNoMCGARequiresClientPIN]: ruleMessages(
    m.overview_ctap_warning_no_mc_ga_without_client_pin_name,
    m.overview_ctap_warning_no_mc_ga_without_client_pin_description,
  ),
  [RuleID.RuleUVBioEnrollRequiresBioEnroll]: ruleMessages(
    m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_name,
    m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_description,
  ),
  [RuleID.RuleUVAcfgRequiresAuthnrCfg]: ruleMessages(
    m.overview_ctap_warning_uv_acfg_without_authnr_cfg_name,
    m.overview_ctap_warning_uv_acfg_without_authnr_cfg_description,
  ),
  [RuleID.RuleAlwaysUVConflictsWithMakeCredUVNotRqd]: ruleMessages(
    m.overview_ctap_warning_always_uv_conflict_name,
    m.overview_ctap_warning_always_uv_conflict_description,
  ),
  [RuleID.RuleAlwaysUVU2FRequiresBuiltInUV]: ruleMessages(
    m.overview_conformance_always_uv_u2f_name,
    m.overview_conformance_always_uv_u2f_description,
  ),
} satisfies Record<ConformanceRuleID, ConformanceRuleMessages>;

export function localizeCtapAssessment(
  assessment: Finding | Inconclusive,
): OverviewConformanceAssessment {
  const messages = CTAP_RULE_MESSAGES[assessment.ruleId as ConformanceRuleID];
  const inconclusive = "reason" in assessment;

  return {
    id: assessment.ruleId,
    kind: inconclusive ? "inconclusive" : "finding",
    profile: assessment.profile,
    name: messages.name(assessment.profile),
    description: messages.description(assessment.profile),
    expectations: assessment.expectations.map(localizeCtapExpectation),
    evidence: assessment.evidence.map(localizeCtapEvidence),
    reason: inconclusive ? localizeEvidenceGap(assessment.reason) : undefined,
    source: [
      ...new Set(assessment.expectations.flatMap((expectation) => expectation.subjects)),
    ].join(" + "),
    references: assessment.references,
  };
}

function localizeCtapExpectation(expectation: Expectation) {
  const subjects = expectation.subjects.join(
    expectation.quantifier === ExpectationQuantifier.ExpectationAny ? ", " : " + ",
  );
  const values = expectation.values.join(", ");

  if (expectation.quantifier === ExpectationQuantifier.ExpectationAny) {
    if (expectation.kind === ExpectationKind.ExpectationRequired)
      return m.conformance_expectation_any_required({ subjects });

    if (expectation.kind === ExpectationKind.ExpectationTrue)
      return m.conformance_expectation_any_true({ subjects });
  }

  switch (expectation.kind) {
    case ExpectationKind.ExpectationRequired:
      return m.conformance_expectation_required({ subjects });
    case ExpectationKind.ExpectationAbsent:
      return m.conformance_expectation_absent({ subjects });
    case ExpectationKind.ExpectationNonEmpty:
      return m.conformance_expectation_non_empty({ subjects });
    case ExpectationKind.ExpectationUnique:
      return m.conformance_expectation_unique({ subjects });
    case ExpectationKind.ExpectationMinimum:
      return m.conformance_expectation_minimum({ subjects, value: values });
    case ExpectationKind.ExpectationRange:
      return m.conformance_expectation_range({
        subjects,
        minimum: expectation.values[0],
        maximum: expectation.values[1],
      });
    case ExpectationKind.ExpectationContains:
      return m.conformance_expectation_contains({ subjects, values });
    case ExpectationKind.ExpectationExcludes:
      return m.conformance_expectation_excludes({ subjects, values });
    case ExpectationKind.ExpectationTrue:
      return m.conformance_expectation_true({ subjects });
    case ExpectationKind.ExpectationNotBoth:
      return m.conformance_expectation_not_both({ subjects });
  }

  throw new Error(`Unexpected conformance expectation kind: ${expectation.kind}`);
}

function localizeCtapEvidence(evidence: Evidence) {
  const values = evidence.values.join(", ");

  switch (evidence.state) {
    case EvidenceState.EvidenceAbsent:
      return m.conformance_evidence_absent({ path: evidence.path });
    case EvidenceState.EvidencePresentEmpty:
      return m.conformance_evidence_present_empty({ path: evidence.path });
    case EvidenceState.EvidencePresent:
      return values
        ? m.conformance_evidence_present_values({ path: evidence.path, values })
        : m.conformance_evidence_present({ path: evidence.path });
    case EvidenceState.EvidenceFalse:
      return m.conformance_evidence_false({ path: evidence.path });
    case EvidenceState.EvidenceTrue:
      return m.conformance_evidence_true({ path: evidence.path });
    case EvidenceState.EvidenceValue:
      return m.conformance_evidence_value({ path: evidence.path, values });
  }

  throw new Error(`Unexpected conformance evidence state: ${evidence.state}`);
}

function localizeEvidenceGap(reason: EvidenceGapID) {
  switch (reason) {
    case EvidenceGapID.EvidenceGapAuthenticatorUIUnknown:
      return m.conformance_gap_authenticator_ui_unknown();
    case EvidenceGapID.EvidenceGapImplicitCredProtectUnknown:
      return m.conformance_gap_implicit_cred_protect_unknown();
    case EvidenceGapID.EvidenceGapBuiltInPINEntryUnknown:
      return m.conformance_gap_built_in_pin_entry_unknown();
  }

  throw new Error(`Unexpected conformance evidence gap: ${reason}`);
}

export function overviewGroupLabel(name: string) {
  const labels: Record<string, string> = {
    Identity: m.group_identity(),
    Interfaces: m.group_interfaces(),
    Vendor: m.group_vendor_details(),
    Protocol: m.group_protocol(),
    Verification: m.group_verification(),
    Storage: m.group_storage(),
    Management: m.group_management(),
    Policy: m.group_policy(),
    Extensions: m.group_extensions(),
    Limits: m.group_limits(),
    Attestation: m.group_attestation(),
  };

  return labels[name] || name;
}

export function overviewStatusLabel(status: OverviewRowStatus) {
  const labels: Record<OverviewRowStatus, string> = {
    supported: m.status_supported(),
    unsupported: m.status_unsupported(),
    configured: m.status_configured(),
    "not configured": m.status_not_configured(),
    enabled: m.status_enabled(),
    disabled: m.status_disabled(),
    warning: m.status_warning(),
    unknown: m.state_unknown(),
    informational: m.status_info(),
  };

  return labels[status];
}

export function mdsStateText(state: OverviewMDSState) {
  const labels: Record<OverviewMDSState, string> = {
    loading: m.mds_loading(),
    found: m.mds_verified(),
    missing: m.mds_not_found(),
    error: m.mds_unavailable(),
    idle: m.mds_waiting(),
  };

  return labels[state];
}

export function mdsDescriptionText(state: OverviewMDSState, error?: string | null) {
  if (state === "loading") return m.mds_loading_description();

  if (state === "found") return m.mds_verified_description();

  if (state === "missing") return m.mds_not_found_description();

  if (state === "error") return error || m.mds_unavailable_description();

  return m.mds_waiting_description();
}
