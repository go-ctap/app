import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { m } from "../paraglide/messages.js";

export function labelDevice(device: DeviceReport | null | undefined) {
  if (!device) return m.no_token_selected();
  const name = deviceName(device);
  const serialValue = device.metadata?.serial || device.serial;
  const serial = serialValue ? ` · ${serialValue}` : "";
  const alias = device.ordinalAlias ? `${device.ordinalAlias}. ` : "";
  return `${alias}${name || device.fingerprint || m.authenticator()}${serial}`;
}

export function deviceName(device: DeviceReport | null | undefined) {
  if (!device) return m.no_token_selected();
  return displayModel(device)
    || [device.manufacturer, device.product].filter(Boolean).join(" ")
    || device.product
    || device.fingerprint
    || m.authenticator();
}

function displayModel(device: DeviceReport) {
  const model = device.metadata?.model?.trim() || "";
  const revision = device.metadata?.firmware?.trim() || "";
  if (device.vendor !== Vendor.VendorToken2 || !model || !revision) return model;

  const suffix = ` ${revision}`;
  return model.endsWith(suffix) ? model.slice(0, -suffix.length).trimEnd() : model;
}

export function deviceDetail(device: DeviceReport | null | undefined) {
  if (!device) return "";
  return device.metadata?.serial || device.serial || device.fingerprint || "";
}

export function sessionStateLabel(value: unknown) {
  const raw = String(value || "");
  if (["idle", "opening", "ready", "running", "error"].includes(raw)) {
    return sessionStateText(raw);
  }
  return raw ? m.unknown_session_state({ state: raw.replaceAll("_", " ") }) : m.state_unknown();
}

export function operationStageLabel(value: unknown) {
  const raw = String(value || "");
  const labels: Record<string, string> = {
    "interaction-required": m.stage_interaction_required(),
    "enumerating-rps": m.stage_enumerating_rps(),
    "enumerating-credentials": m.stage_enumerating_credentials(),
    "capturing-bio-sample": m.stage_capturing_bio_sample(),
  };
  return labels[raw] || raw.replaceAll("-", " ") || m.operation_running();
}

const permissionMessages: Readonly<Record<string, () => string>> = {
  authenticatorconfiguration: m.permission_authenticator_configuration,
  bioenrollment: m.permission_bio_enrollment,
  credentialmanagement: m.permission_credential_management,
  getassertion: m.permission_get_assertion,
  largeblobwrite: m.permission_large_blob_write,
  makecredential: m.permission_make_credential,
  none: m.permission_none,
  persistentcredentialmanagementreadonly: m.permission_persistent_credential_management_read_only,
};

export function permissionLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.replace(/^Permission/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return permissionMessages[key]?.() ?? humanizeIdentifier(raw, "Permission");
}

const sampleStatusMessages: Readonly<Record<string, () => string>> = {
  exists: m.sample_status_fingerprint_exists,
  good: m.sample_status_fingerprint_good,
  mergefailure: m.sample_status_fingerprint_merge_failure,
  nouseractivity: m.sample_status_no_user_activity,
  nouserpresencetransition: m.sample_status_no_user_presence_transition,
  poorquality: m.sample_status_fingerprint_poor_quality,
  toofast: m.sample_status_fingerprint_too_fast,
  toohigh: m.sample_status_fingerprint_too_high,
  tooleft: m.sample_status_fingerprint_too_left,
  toolow: m.sample_status_fingerprint_too_low,
  tooright: m.sample_status_fingerprint_too_right,
  tooshort: m.sample_status_fingerprint_too_short,
  tooskewed: m.sample_status_fingerprint_too_skewed,
  tooslow: m.sample_status_fingerprint_too_slow,
};

export function bioSampleStatusLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw
    .replace(/^LastEnrollSampleStatus/, "")
    .replace(/^Fingerprint/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  return sampleStatusMessages[key]?.() ?? humanizeIdentifier(raw, "LastEnrollSampleStatus");
}

function humanizeIdentifier(value: string, prefix: string) {
  return value
    .replace(new RegExp(`^${prefix}`), "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function sessionStateText(raw: string) {
  const labels: Record<string, string> = {
    idle: m.session_idle(),
    opening: m.session_opening(),
    ready: m.session_ready(),
    running: m.session_running(),
    error: m.session_error(),
  };
  return labels[raw] || raw;
}
