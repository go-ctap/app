import { m } from "../paraglide/messages.js";
import type { OverviewMDSState, OverviewRowStatus } from "$lib/overview-types.js";

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
