import { m } from "../paraglide/messages.js";
import type { CtapConformanceFinding, CtapConformanceFindingId, CtapFindingValue } from "./overview-ctap23.js";
import type { OverviewConformanceWarning, OverviewHeroModel, OverviewRowStatus } from "./overview-types.js";

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
  id: CtapConformanceFindingId;
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

type CtapWarningMessages = {
  name: () => string;
  description: (args: CtapWarningMessageArgs) => string;
};

const CTAP_WARNING_MESSAGES = {
  versions_required: {
    name: m.overview_ctap_warning_versions_required_name,
    description: m.overview_ctap_warning_versions_required_description,
  },
  aaguid_required: {
    name: m.overview_ctap_warning_aaguid_required_name,
    description: m.overview_ctap_warning_aaguid_required_description,
  },
  fido22_forbidden: {
    name: m.overview_ctap_warning_fido22_forbidden_name,
    description: m.overview_ctap_warning_fido22_forbidden_description,
  },
  pin_uv_auth_protocols_list_empty: {
    name: m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_name,
    description: m.overview_ctap_warning_pin_uv_auth_protocols_list_empty_description,
  },
  pin_uv_auth_protocols_list_duplicate: {
    name: m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_name,
    description: m.overview_ctap_warning_pin_uv_auth_protocols_list_duplicate_description,
  },
  transports_list_empty: {
    name: m.overview_ctap_warning_transports_list_empty_name,
    description: m.overview_ctap_warning_transports_list_empty_description,
  },
  transports_list_duplicate: {
    name: m.overview_ctap_warning_transports_list_duplicate_name,
    description: m.overview_ctap_warning_transports_list_duplicate_description,
  },
  algorithms_list_empty: {
    name: m.overview_ctap_warning_algorithms_list_empty_name,
    description: m.overview_ctap_warning_algorithms_list_empty_description,
  },
  algorithms_list_duplicate: {
    name: m.overview_ctap_warning_algorithms_list_duplicate_name,
    description: m.overview_ctap_warning_algorithms_list_duplicate_description,
  },
  max_credential_count_in_list_positive: {
    name: m.overview_ctap_warning_max_credential_count_in_list_positive_name,
    description: m.overview_ctap_warning_max_credential_count_in_list_positive_description,
  },
  max_credential_id_length_positive: {
    name: m.overview_ctap_warning_max_credential_id_length_positive_name,
    description: m.overview_ctap_warning_max_credential_id_length_positive_description,
  },
  max_msg_size_minimum: {
    name: m.overview_ctap_warning_max_msg_size_minimum_name,
    description: m.overview_ctap_warning_max_msg_size_minimum_description,
  },
  preferred_platform_uv_attempts_minimum: {
    name: m.overview_ctap_warning_preferred_platform_uv_attempts_minimum_name,
    description: m.overview_ctap_warning_preferred_platform_uv_attempts_minimum_description,
  },
  ctap23_hmac_secret: {
    name: m.overview_ctap_warning_ctap23_hmac_secret_name,
    description: m.overview_ctap_warning_ctap23_hmac_secret_description,
  },
  ctap23_rk_uv_state: {
    name: m.overview_ctap_warning_ctap23_rk_uv_state_name,
    description: m.overview_ctap_warning_ctap23_rk_uv_state_description,
  },
  ctap23_rk_cred_mgmt: {
    name: m.overview_ctap_warning_ctap23_rk_cred_mgmt_name,
    description: m.overview_ctap_warning_ctap23_rk_cred_mgmt_description,
  },
  ctap23_cred_protect: {
    name: m.overview_ctap_warning_ctap23_cred_protect_name,
    description: m.overview_ctap_warning_ctap23_cred_protect_description,
  },
  ctap23_pin_uv_auth_token: {
    name: m.overview_ctap_warning_ctap23_pin_uv_auth_token_name,
    description: m.overview_ctap_warning_ctap23_pin_uv_auth_token_description,
  },
  ctap23_pin_protocol_two: {
    name: m.overview_ctap_warning_ctap23_pin_protocol_two_name,
    description: m.overview_ctap_warning_ctap23_pin_protocol_two_description,
  },
  credblob_requires_credprotect: {
    name: m.overview_ctap_warning_credblob_requires_credprotect_name,
    description: m.overview_ctap_warning_credblob_requires_credprotect_description,
  },
  credblob_requires_limit: {
    name: m.overview_ctap_warning_credblob_requires_limit_name,
    description: m.overview_ctap_warning_credblob_requires_limit_description,
  },
  credblob_limit_invalid: {
    name: m.overview_ctap_warning_credblob_limit_invalid_name,
    description: m.overview_ctap_warning_credblob_limit_invalid_description,
  },
  credblob_limit_without_extension: {
    name: m.overview_ctap_warning_credblob_limit_without_extension_name,
    description: m.overview_ctap_warning_credblob_limit_without_extension_description,
  },
  largeblob_mode_conflict: {
    name: m.overview_ctap_warning_largeblob_mode_conflict_name,
    description: m.overview_ctap_warning_largeblob_mode_conflict_description,
  },
  largeblob_key_incomplete: {
    name: m.overview_ctap_warning_largeblob_key_incomplete_name,
    description: m.overview_ctap_warning_largeblob_key_incomplete_description,
  },
  largeblobs_requires_limit: {
    name: m.overview_ctap_warning_largeblobs_requires_limit_name,
    description: m.overview_ctap_warning_largeblobs_requires_limit_description,
  },
  largeblobs_limit_invalid: {
    name: m.overview_ctap_warning_largeblobs_limit_invalid_name,
    description: m.overview_ctap_warning_largeblobs_limit_invalid_description,
  },
  largeblobs_limit_without_command: {
    name: m.overview_ctap_warning_largeblobs_limit_without_command_name,
    description: m.overview_ctap_warning_largeblobs_limit_without_command_description,
  },
  min_pin_extension_without_option: {
    name: m.overview_ctap_warning_min_pin_extension_without_option_name,
    description: m.overview_ctap_warning_min_pin_extension_without_option_description,
  },
  set_min_pin_without_uv: {
    name: m.overview_ctap_warning_set_min_pin_without_uv_name,
    description: m.overview_ctap_warning_set_min_pin_without_uv_description,
  },
  set_min_pin_command_missing: {
    name: m.overview_ctap_warning_set_min_pin_command_missing_name,
    description: m.overview_ctap_warning_set_min_pin_command_missing_description,
  },
  max_rpids_invalid: {
    name: m.overview_ctap_warning_max_rpids_invalid_name,
    description: m.overview_ctap_warning_max_rpids_invalid_description,
  },
  max_rpids_without_set_min_pin: {
    name: m.overview_ctap_warning_max_rpids_without_set_min_pin_name,
    description: m.overview_ctap_warning_max_rpids_without_set_min_pin_description,
  },
  min_pin_length_invalid: {
    name: m.overview_ctap_warning_min_pin_length_invalid_name,
    description: m.overview_ctap_warning_min_pin_length_invalid_description,
  },
  min_pin_without_client_pin: {
    name: m.overview_ctap_warning_min_pin_without_client_pin_name,
    description: m.overview_ctap_warning_min_pin_without_client_pin_description,
  },
  min_pin_missing: {
    name: m.overview_ctap_warning_min_pin_missing_name,
    description: m.overview_ctap_warning_min_pin_missing_description,
  },
  max_pin_length_invalid: {
    name: m.overview_ctap_warning_max_pin_length_invalid_name,
    description: m.overview_ctap_warning_max_pin_length_invalid_description,
  },
  max_pin_without_client_pin: {
    name: m.overview_ctap_warning_max_pin_without_client_pin_name,
    description: m.overview_ctap_warning_max_pin_without_client_pin_description,
  },
  pin_complexity_extension_without_set_min_pin: {
    name: m.overview_ctap_warning_pin_complexity_extension_without_set_min_pin_name,
    description: m.overview_ctap_warning_pin_complexity_extension_without_set_min_pin_description,
  },
  pin_complexity_without_client_pin: {
    name: m.overview_ctap_warning_pin_complexity_without_client_pin_name,
    description: m.overview_ctap_warning_pin_complexity_without_client_pin_description,
  },
  no_mc_ga_without_client_pin: {
    name: m.overview_ctap_warning_no_mc_ga_without_client_pin_name,
    description: m.overview_ctap_warning_no_mc_ga_without_client_pin_description,
  },
  uv_bio_enroll_without_bio_enroll: {
    name: m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_name,
    description: m.overview_ctap_warning_uv_bio_enroll_without_bio_enroll_description,
  },
  uv_acfg_without_authnr_cfg: {
    name: m.overview_ctap_warning_uv_acfg_without_authnr_cfg_name,
    description: m.overview_ctap_warning_uv_acfg_without_authnr_cfg_description,
  },
  always_uv_conflict: {
    name: m.overview_ctap_warning_always_uv_conflict_name,
    description: m.overview_ctap_warning_always_uv_conflict_description,
  },
  enterprise_attestation_command_missing: {
    name: m.overview_ctap_warning_enterprise_attestation_command_missing_name,
    description: m.overview_ctap_warning_enterprise_attestation_command_missing_description,
  },
  vendor_prototype_command_missing: {
    name: m.overview_ctap_warning_vendor_prototype_command_missing_name,
    description: m.overview_ctap_warning_vendor_prototype_command_missing_description,
  },
  long_touch_command_missing: {
    name: m.overview_ctap_warning_long_touch_command_missing_name,
    description: m.overview_ctap_warning_long_touch_command_missing_description,
  }
} satisfies Record<CtapConformanceFindingId, CtapWarningMessages>;

export function localizeCtapWarning(finding: CtapConformanceFinding): OverviewConformanceWarning {
  const warningValue = localizeCtapWarningValue(finding.value);
  const messages = CTAP_WARNING_MESSAGES[finding.id];
  const args = ctapWarningArgs(finding, warningValue);

  return {
    id: finding.id,
    name: messages.name(),
    description: messages.description(args),
    value: warningValue,
    source: finding.source,
  };
}

function ctapWarningArgs(finding: CtapConformanceFinding, warningValue: string): CtapWarningMessageArgs {
  const args = finding.args ?? {};

  return {
    id: finding.id,
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

function localizeCtapWarningValue(input: CtapFindingValue) {
  if (input.kind === "literal") return input.value;
  if (input.kind === "input") return formatCtapValueInput(input.input);
  if (input.kind === "list") return input.items.length ? input.items.map(formatCtapValueInput).join(", ") : value.emptyList();

  switch (input.id) {
    case "empty_list":
      return value.emptyList();
    case "extension_reported_command_missing":
      return value.extensionReportedCommandMissing();
    case "mutually_exclusive_support_reported":
      return value.mutuallyExclusiveSupportReported();
    case "not_listed":
      return value.notListed();
    case "not_reported":
      return value.notReported();
  }

  return assertNever(input.id);
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

function assertNever(input: never): never {
  throw new Error(`Unexpected CTAP warning value: ${String(input)}`);
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

export function mdsStateText(state: OverviewHeroModel["mdsState"]) {
  const labels: Record<OverviewHeroModel["mdsState"], string> = {
    loading: m.mds_loading(),
    found: m.mds_verified(),
    missing: m.mds_not_found(),
    error: m.mds_unavailable(),
    idle: m.mds_waiting(),
  };
  return labels[state];
}

export function mdsDescriptionText(state: OverviewHeroModel["mdsState"], error?: string | null) {
  if (state === "loading") return m.mds_loading_description();
  if (state === "found") return m.mds_verified_description();
  if (state === "missing") return m.mds_not_found_description();
  if (state === "error") return error || m.mds_unavailable_description();
  return m.mds_waiting_description();
}
