import { m } from "../paraglide/messages.js";

export function labelDevice(device: any) {
  if (!device) return m.no_token_selected();
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ");
  const serial = device.serial ? ` · ${device.serial}` : "";
  const alias = device.ordinalAlias ? `${device.ordinalAlias}. ` : "";
  return `${alias}${name || device.deviceId || m.authenticator()}${serial}`;
}

export function stateLabel(value: unknown) {
  if (value === true) return m.state_available();
  if (value === false) return m.state_not_available();
  if (value === null || value === undefined || value === "") return m.state_unknown();
  return String(value).replaceAll("_", " ");
}

export function sessionStateLabel(value: unknown) {
  const raw = String(value || "");
  if (["idle", "opening", "ready", "running", "stale", "closed", "error"].includes(raw)) {
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

export function pretty(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

export function asList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function resultOf(envelope: any) {
  return envelope?.result?.result ?? envelope?.result?.report ?? envelope?.result ?? null;
}

export function reportOf(envelope: any) {
  return envelope?.result?.report ?? envelope?.result?.result ?? envelope?.result ?? null;
}

function sessionStateText(raw: string) {
  const labels: Record<string, string> = {
    idle: m.session_idle(),
    opening: m.session_opening(),
    ready: m.session_ready(),
    running: m.session_running(),
    stale: m.session_stale(),
    closed: m.session_closed(),
    error: m.session_error(),
  };
  return labels[raw] || raw;
}
