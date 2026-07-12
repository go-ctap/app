import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { m } from "../paraglide/messages.js";

export function labelDevice(device: DeviceReport | null | undefined) {
  if (!device) return m.no_token_selected();
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ");
  const serial = device.serial ? ` · ${device.serial}` : "";
  const alias = device.ordinalAlias ? `${device.ordinalAlias}. ` : "";
  return `${alias}${name || device.deviceId || m.authenticator()}${serial}`;
}

export function deviceName(device: DeviceReport | null | undefined) {
  if (!device) return m.no_token_selected();
  return [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || m.authenticator();
}

export function deviceDetail(device: DeviceReport | null | undefined) {
  if (!device) return "";
  return device.serial || device.deviceId || "";
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
