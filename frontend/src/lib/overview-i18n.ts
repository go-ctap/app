import { CommonValueID, FindingValueKind, type Finding, type FindingValue } from "../../bindings/github.com/go-ctap/kit/model/conformance";

import { m } from "../paraglide/messages.js";
import type { OverviewConformanceWarning, OverviewMDSState, OverviewRowStatus } from "./overview-types.js";

export { m };

export const value = {
  absent: () => m.matrix_value_absent(),
  algorithmsNotReported: () => m.matrix_value_algorithms_not_reported(),
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
  extensionPlusCommandSupport: () => m.matrix_value_extension_plus_command_support(),
  extensionReportedCommandMissing: () => m.matrix_value_extension_reported_command_support_missing(),
  extensionsNotReported: () => m.matrix_value_extensions_not_reported(),
  falseOrAbsent: () => m.matrix_value_false_or_absent(),
  integerExact: (count: number) => m.matrix_value_integer_exact({ count }),
  integerRange: (min: number, max: number) => m.matrix_value_integer_range({ min, max }),
  integerValue: () => m.matrix_value_integer_value(),
  invalid: (item: string) => m.matrix_value_invalid_value({ value: item }),
  level: (item: string) => m.matrix_value_level({ value: item }),
  missingClientPin: () => m.matrix_value_missing_required_with_clientpin(),
  missingCredBlob: () => m.matrix_value_missing_required_with_credblob(),
  missingLargeBlobs: () => m.matrix_value_missing_required_with_large_blobs(),
  missingSetMinPinLength: () => m.matrix_value_missing_required_with_set_min_pin_length(),
  mutuallyExclusiveSupportReported: () => m.matrix_value_mutually_exclusive_support_reported(),
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
  unsupportedSetMinPinLength: (item: string) => m.matrix_value_set_min_pin_length_not_supported({ value: item }),
  uvMayBeSkipped: () => m.matrix_value_uv_may_be_skipped(),
  uvRequired: () => m.matrix_value_uv_required(),
  uvRequiredByDefault: () => m.matrix_value_uv_required_by_default(),
};

type CtapWarningMessageArgs = {
  id: ConformanceFindingId;
  source: string;
  value: string;
  field: string;
  minimum: number;
  command: string;
  extension: string;
  option: string;
  protocol: string;
  version: string;
};

export const CTAP_CONFORMANCE_FINDING_IDS = [
  "versions_required",
  "fido22_forbidden",
  "pin_uv_auth_protocols_list_empty",
  "pin_uv_auth_protocols_list_duplicate",
  "transports_list_empty",
  "transports_list_duplicate",
  "algorithms_list_empty",
  "algorithms_list_duplicate",
  "transports_for_reset_list_empty",
  "transports_for_reset_list_duplicate",
  "attestation_formats_list_empty",
  "attestation_formats_list_duplicate",
  "attestation_formats_none",
  "max_credential_count_in_list_positive",
  "max_credential_id_length_positive",
  "max_msg_size_minimum",
  "preferred_platform_uv_attempts_minimum",
  "ctap23_hmac_secret",
  "ctap23_rk_uv_state",
  "ctap23_pin_uv_auth_token",
  "ctap23_pin_protocol_two",
  "credblob_requires_credprotect",
  "credblob_requires_limit",
  "credblob_limit_invalid",
  "credblob_limit_without_extension",
  "largeblob_mode_conflict",
  "largeblob_extensions_conflict",
  "largeblob_key_incomplete",
  "largeblobs_requires_limit",
  "largeblobs_limit_invalid",
  "largeblobs_limit_without_command",
  "min_pin_extension_without_option",
  "set_min_pin_without_extension",
  "set_min_pin_without_uv",
  "set_min_pin_command_missing",
  "max_rpids_without_set_min_pin",
  "max_rpids_missing_with_set_min_pin",
  "min_pin_length_invalid",
  "min_pin_without_client_pin",
  "min_pin_missing",
  "max_pin_length_invalid",
  "max_pin_without_client_pin",
  "pin_complexity_extension_without_set_min_pin",
  "pin_complexity_without_client_pin",
  "no_mc_ga_without_client_pin",
  "uv_bio_enroll_without_bio_enroll",
  "uv_acfg_without_authnr_cfg",
  "config_commands_without_authnr_cfg",
  "always_uv_conflict",
  "always_uv_command_missing",
  "enterprise_attestation_command_missing",
  "vendor_prototype_command_missing",
  "long_touch_command_missing",
] as const;

type ConformanceFindingId = (typeof CTAP_CONFORMANCE_FINDING_IDS)[number];

type CtapWarningMessages = {
  name: () => string;
  description: (args: CtapWarningMessageArgs) => string;
  value: (args: CtapWarningMessageArgs) => string;
};

const CTAP_WARNING_MESSAGES = {
  versions_required: {
    name: m.overview_ctap_warning_versions_required_name,
    description: m.overview_ctap_warning_versions_required_description,
    value: m.overview_ctap_warning_versions_required_value,
  },
  fido22_forbidden: {
    name: m.overview_ctap_warning_fido22_forbidden_name,
    description: m.overview_ctap_warning_fido22_forbidden_description,
    value: m.overview_ctap_warning_fido22_forbidden_value,
  },
  pin_uv_auth_protocols_list_empty: {
    name: m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_name,
    description: m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_description,
    value: m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_value,
  },
  pin_uv_auth_protocols_list_duplicate: {
    name: m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_name,
    description: m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_description,
    value: m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_value,
  },
  transports_list_empty: {
    name: m.overview_ctap_warning_transports_list_empty_name,
    description: m.overview_ctap_warning_transports_list_empty_description,
    value: m.overview_ctap_warning_transports_list_empty_value,
  },
  transports_list_duplicate: {
    name: m.overview_ctap_warning_transports_list_duplicate_name,
    description: m.overview_ctap_warning_transports_list_duplicate_description,
    value: m.overview_ctap_warning_transports_list_duplicate_value,
  },
  algorithms_list_empty: {
    name: m.overview_ctap_warning_algorithms_list_empty_name,
    description: m.overview_ctap_warning_algorithms_list_empty_description,
    value: m.overview_ctap_warning_algorithms_list_empty_value,
  },
  algorithms_list_duplicate: {
    name: m.overview_ctap_warning_algorithms_list_duplicate_name,
    description: m.overview_ctap_warning_algorithms_list_duplicate_description,
    value: m.overview_ctap_warning_algorithms_list_duplicate_value,
  },
  transports_for_reset_list_empty: {
    name: m.overview_ctap_warning_transports_for_reset_list_empty_name,
    description: m.overview_ctap_warning_transports_for_reset_list_empty_description,
    value: m.overview_ctap_warning_transports_for_reset_list_empty_value,
  },
  transports_for_reset_list_duplicate: {
    name: m.overview_ctap_warning_transports_for_reset_list_duplicate_name,
    description: m.overview_ctap_warning_transports_for_reset_list_duplicate_description,
    value: m.overview_ctap_warning_transports_for_reset_list_duplicate_value,
  },
  attestation_formats_list_empty: {
    name: m.overview_ctap_warning_attestation_formats_list_empty_name,
    description: m.overview_ctap_warning_attestation_formats_list_empty_description,
    value: m.overview_ctap_warning_attestation_formats_list_empty_value,
  },
  attestation_formats_list_duplicate: {
    name: m.overview_ctap_warning_attestation_formats_list_duplicate_name,
    description: m.overview_ctap_warning_attestation_formats_list_duplicate_description,
    value: m.overview_ctap_warning_attestation_formats_list_duplicate_value,
  },
  attestation_formats_none: {
    name: m.overview_ctap_warning_attestation_formats_none_name,
    description: m.overview_ctap_warning_attestation_formats_none_description,
    value: m.overview_ctap_warning_attestation_formats_none_value,
  },
  max_credential_count_in_list_positive: {
    name: m.overview_ctap_warning_max_credential_count_in_list_positive_name,
    description: m.overview_ctap_warning_max_credential_count_in_list_positive_description,
    value: m.overview_ctap_warning_max_credential_count_in_list_positive_value,
  },
  max_credential_id_length_positive: {
    name: m.overview_ctap_warning_max_credential_id_length_positive_name,
    description: m.overview_ctap_warning_max_credential_id_length_positive_description,
    value: m.overview_ctap_warning_max_credential_id_length_positive_value,
  },
  max_msg_size_minimum: {
    name: m.overview_ctap_warning_max_msg_size_minimum_name,
    description: m.overview_ctap_warning_max_msg_size_minimum_description,
    value: m.overview_ctap_warning_max_msg_size_minimum_value,
  },
  preferred_platform_uv_attempts_minimum: {
    name: m.overview_ctap_warning_preferred_platform_uv_attempts_minimum_name,
    description: m.overview_ctap_warning_preferred_platform_uv_attempts_minimum_description,
    value: m.overview_ctap_warning_preferred_platform_uv_attempts_minimum_value,
  },
  ctap23_hmac_secret: {
    name: m.overview_ctap_warning_ctap23_hmac_secret_name,
    description: m.overview_ctap_warning_ctap23_hmac_secret_description,
    value: m.overview_ctap_warning_ctap23_hmac_secret_value,
  },
  ctap23_rk_uv_state: {
    name: m.overview_ctap_warning_ctap23_rk_uv_state_name,
    description: m.overview_ctap_warning_ctap23_rk_uv_state_description,
    value: m.overview_ctap_warning_ctap23_rk_uv_state_value,
  },
  ctap23_pin_uv_auth_token: {
    name: m.overview_ctap_warning_ctap23_pin_uv_auth_token_name,
    description: m.overview_ctap_warning_ctap23_pin_uv_auth_token_description,
    value: m.overview_ctap_warning_ctap23_pin_uv_auth_token_value,
  },
  ctap23_pin_protocol_two: {
    name: m.overview_ctap_warning_ctap23_pin_protocol_two_name,
    description: m.overview_ctap_warning_ctap23_pin_protocol_two_description,
    value: m.overview_ctap_warning_ctap23_pin_protocol_two_value,
  },
  credblob_requires_credprotect: {
    name: m.overview_ctap_warning_credblob_requires_credprotect_name,
    description: m.overview_ctap_warning_credblob_requires_credprotect_description,
    value: m.overview_ctap_warning_credblob_requires_credprotect_value,
  },
  credblob_requires_limit: {
    name: m.overview_ctap_warning_credblob_requires_limit_name,
    description: m.overview_ctap_warning_credblob_requires_limit_description,
    value: m.overview_ctap_warning_credblob_requires_limit_value,
  },
  credblob_limit_invalid: {
    name: m.overview_ctap_warning_credblob_limit_invalid_name,
    description: m.overview_ctap_warning_credblob_limit_invalid_description,
    value: m.overview_ctap_warning_credblob_limit_invalid_value,
  },
  credblob_limit_without_extension: {
    name: m.overview_ctap_warning_credblob_limit_without_extension_name,
    description: m.overview_ctap_warning_credblob_limit_without_extension_description,
    value: m.overview_ctap_warning_credblob_limit_without_extension_value,
  },
  largeblob_mode_conflict: {
    name: m.overview_ctap_warning_largeblob_mode_conflict_name,
    description: m.overview_ctap_warning_largeblob_mode_conflict_description,
    value: m.overview_ctap_warning_largeblob_mode_conflict_value,
  },
  largeblob_extensions_conflict: {
    name: m.overview_ctap_warning_largeblob_extensions_conflict_name,
    description: m.overview_ctap_warning_largeblob_extensions_conflict_description,
    value: m.overview_ctap_warning_largeblob_extensions_conflict_value,
  },
  largeblob_key_incomplete: {
    name: m.overview_ctap_warning_largeblob_key_incomplete_name,
    description: m.overview_ctap_warning_largeblob_key_incomplete_description,
    value: m.overview_ctap_warning_largeblob_key_incomplete_value,
  },
  largeblobs_requires_limit: {
    name: m.overview_ctap_warning_largeblobs_requires_limit_name,
    description: m.overview_ctap_warning_largeblobs_requires_limit_description,
    value: m.overview_ctap_warning_largeblobs_requires_limit_value,
  },
  largeblobs_limit_invalid: {
    name: m.overview_ctap_warning_largeblobs_limit_invalid_name,
    description: m.overview_ctap_warning_largeblobs_limit_invalid_description,
    value: m.overview_ctap_warning_largeblobs_limit_invalid_value,
  },
  largeblobs_limit_without_command: {
    name: m.overview_ctap_warning_largeblobs_limit_without_command_name,
    description: m.overview_ctap_warning_largeblobs_limit_without_command_description,
    value: m.overview_ctap_warning_largeblobs_limit_without_command_value,
  },
  min_pin_extension_without_option: {
    name: m.overview_ctap_warning_min_pin_extension_without_option_name,
    description: m.overview_ctap_warning_min_pin_extension_without_option_description,
    value: m.overview_ctap_warning_min_pin_extension_without_option_value,
  },
  set_min_pin_without_extension: {
    name: m.overview_ctap_warning_set_min_pin_without_extension_name,
    description: m.overview_ctap_warning_set_min_pin_without_extension_description,
    value: m.overview_ctap_warning_set_min_pin_without_extension_value,
  },
  set_min_pin_without_uv: {
    name: m.overview_ctap_warning_set_min_pin_without_uv_name,
    description: m.overview_ctap_warning_set_min_pin_without_uv_description,
    value: m.overview_ctap_warning_set_min_pin_without_uv_value,
  },
  set_min_pin_command_missing: {
    name: m.overview_ctap_warning_set_min_pin_command_missing_name,
    description: m.overview_ctap_warning_set_min_pin_command_missing_description,
    value: m.overview_ctap_warning_set_min_pin_command_missing_value,
  },
  max_rpids_without_set_min_pin: {
    name: m.overview_ctap_warning_max_rpids_without_set_min_pin_name,
    description: m.overview_ctap_warning_max_rpids_without_set_min_pin_description,
    value: m.overview_ctap_warning_max_rpids_without_set_min_pin_value,
  },
  max_rpids_missing_with_set_min_pin: {
    name: m.overview_ctap_warning_max_rpids_missing_with_set_min_pin_name,
    description: m.overview_ctap_warning_max_rpids_missing_with_set_min_pin_description,
    value: m.overview_ctap_warning_max_rpids_missing_with_set_min_pin_value,
  },
  min_pin_length_invalid: {
    name: m.overview_ctap_warning_min_pin_length_invalid_name,
    description: m.overview_ctap_warning_min_pin_length_invalid_description,
    value: m.overview_ctap_warning_min_pin_length_invalid_value,
  },
  min_pin_without_client_pin: {
    name: m.overview_ctap_warning_min_pin_without_client_pin_name,
    description: m.overview_ctap_warning_min_pin_without_client_pin_description,
    value: m.overview_ctap_warning_min_pin_without_client_pin_value,
  },
  min_pin_missing: {
    name: m.overview_ctap_warning_min_pin_missing_name,
    description: m.overview_ctap_warning_min_pin_missing_description,
    value: m.overview_ctap_warning_min_pin_missing_value,
  },
  max_pin_length_invalid: {
    name: m.overview_ctap_warning_max_pin_length_invalid_name,
    description: m.overview_ctap_warning_max_pin_length_invalid_description,
    value: m.overview_ctap_warning_max_pin_length_invalid_value,
  },
  max_pin_without_client_pin: {
    name: m.overview_ctap_warning_max_pin_without_client_pin_name,
    description: m.overview_ctap_warning_max_pin_without_client_pin_description,
    value: m.overview_ctap_warning_max_pin_without_client_pin_value,
  },
  pin_complexity_extension_without_set_min_pin: {
    name: m.overview_ctap_warning_pin_complexity_extension_without_set_min_pin_name,
    description: m.overview_ctap_warning_pin_complexity_extension_without_set_min_pin_description,
    value: m.overview_ctap_warning_pin_complexity_extension_without_set_min_pin_value,
  },
  pin_complexity_without_client_pin: {
    name: m.overview_ctap_warning_pin_complexity_without_client_pin_name,
    description: m.overview_ctap_warning_pin_complexity_without_client_pin_description,
    value: m.overview_ctap_warning_pin_complexity_without_client_pin_value,
  },
  no_mc_ga_without_client_pin: {
    name: m.overview_ctap_warning_no_mc_ga_without_client_pin_name,
    description: m.overview_ctap_warning_no_mc_ga_without_client_pin_description,
    value: m.overview_ctap_warning_no_mc_ga_without_client_pin_value,
  },
  uv_bio_enroll_without_bio_enroll: {
    name: m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_name,
    description: m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_description,
    value: m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_value,
  },
  uv_acfg_without_authnr_cfg: {
    name: m.overview_ctap_warning_uv_acfg_without_authnr_cfg_name,
    description: m.overview_ctap_warning_uv_acfg_without_authnr_cfg_description,
    value: m.overview_ctap_warning_uv_acfg_without_authnr_cfg_value,
  },
  config_commands_without_authnr_cfg: {
    name: m.overview_ctap_warning_config_commands_without_authnr_cfg_name,
    description: m.overview_ctap_warning_config_commands_without_authnr_cfg_description,
    value: m.overview_ctap_warning_config_commands_without_authnr_cfg_value,
  },
  always_uv_conflict: {
    name: m.overview_ctap_warning_always_uv_conflict_name,
    description: m.overview_ctap_warning_always_uv_conflict_description,
    value: m.overview_ctap_warning_always_uv_conflict_value,
  },
  always_uv_command_missing: {
    name: m.overview_ctap_warning_always_uv_command_missing_name,
    description: m.overview_ctap_warning_always_uv_command_missing_description,
    value: m.overview_ctap_warning_always_uv_command_missing_value,
  },
  enterprise_attestation_command_missing: {
    name: m.overview_ctap_warning_enterprise_attestation_command_missing_name,
    description: m.overview_ctap_warning_enterprise_attestation_command_missing_description,
    value: m.overview_ctap_warning_enterprise_attestation_command_missing_value,
  },
  vendor_prototype_command_missing: {
    name: m.overview_ctap_warning_vendor_prototype_command_missing_name,
    description: m.overview_ctap_warning_vendor_prototype_command_missing_description,
    value: m.overview_ctap_warning_vendor_prototype_command_missing_value,
  },
  long_touch_command_missing: {
    name: m.overview_ctap_warning_long_touch_command_missing_name,
    description: m.overview_ctap_warning_long_touch_command_missing_description,
    value: m.overview_ctap_warning_long_touch_command_missing_value,
  }
} satisfies Record<ConformanceFindingId, CtapWarningMessages>;

export function localizeCtapWarning(finding: Finding): OverviewConformanceWarning {
  const id = finding.id as ConformanceFindingId;
  const warningValue = localizeCtapWarningValue(finding.value);
  const messages = CTAP_WARNING_MESSAGES[id];
  const args = ctapWarningArgs(finding, warningValue);

  return {
    id,
    name: messages.name(),
    description: messages.description(args),
    value: messages.value(args),
    source: finding.source,
  };
}

function ctapWarningArgs(finding: Finding, warningValue: string): CtapWarningMessageArgs {
  const args = finding.args ?? {};

  return {
    id: finding.id as ConformanceFindingId,
    source: finding.source,
    value: warningValue,
    field: stringArg(args.field, finding.source),
    minimum: numberArg(args.minimum, 0),
    command: stringArg(args.command, ""),
    extension: stringArg(args.extension, ""),
    option: stringArg(args.option, ""),
    protocol: stringArg(args.protocol, ""),
    version: stringArg(args.version, ""),
  };
}

function stringArg(input: unknown, fallback: string) {
  return input === null || input === undefined || input === "" ? fallback : String(input);
}

function numberArg(input: unknown, fallback: number) {
  return typeof input === "number" && Number.isFinite(input) ? input : fallback;
}

function localizeCtapWarningValue(input: FindingValue) {
  if (input.kind === FindingValueKind.FindingValueLiteral) return input.value ?? "";
  if (input.kind === FindingValueKind.FindingValueInput) return formatCtapValueInput(input.input);
  if (input.kind === FindingValueKind.FindingValueList) {
    const items = input.items ?? [];
    return items.length ? items.map(formatCtapValueInput).join(", ") : value.emptyList();
  }

  switch (input.id) {
    case CommonValueID.CommonValueEmptyList:
      return value.emptyList();
    case CommonValueID.CommonValueExtensionReportedCommandMissing:
      return value.extensionReportedCommandMissing();
    case CommonValueID.CommonValueMutuallyExclusiveSupportReported:
      return value.mutuallyExclusiveSupportReported();
    case CommonValueID.CommonValueNotListed:
      return value.notListed();
    case CommonValueID.CommonValueNotReported:
      return value.notReported();
  }

  throw new Error(`Unexpected CTAP warning value: ${String(input.id)}`);
}

function formatCtapValueInput(input: unknown) {
  if (input === null || input === undefined) return value.stateUnknown();
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") return String(input);
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

export function overviewGroupLabel(name: string) {
  const labels: Record<string, string> = {
    Identity: m.group_identity(),
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
