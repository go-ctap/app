export function labelDevice(device: any) {
  if (!device) return "No token selected";
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ");
  const serial = device.serial ? ` · ${device.serial}` : "";
  const alias = device.ordinalAlias ? `${device.ordinalAlias}. ` : "";
  return `${alias}${name || device.deviceId || "Authenticator"}${serial}`;
}

export function stateLabel(value: unknown) {
  if (value === true) return "available";
  if (value === false) return "not available";
  if (value === null || value === undefined || value === "") return "unknown";
  return String(value).replaceAll("_", " ");
}

export function sessionStateLabel(value: unknown) {
  const raw = String(value || "");
  if (["idle", "opening", "ready", "running", "stale", "closed", "error"].includes(raw)) {
    return raw.replaceAll("_", " ");
  }
  return raw ? `unknown session state: ${raw.replaceAll("_", " ")}` : "unknown";
}

export function operationStageLabel(value: unknown) {
  const raw = String(value || "");
  const labels: Record<string, string> = {
    "operation-started": "Operation started",
    "interaction-required": "Interaction required",
    "enumerating-rps": "Enumerating relying parties",
    "enumerating-credentials": "Enumerating credentials",
    "reading-large-blob-array": "Reading large blob array",
    "writing-large-blob-array": "Writing large blob array",
    "capturing-bio-sample": "Capturing biometric sample",
    "operation-completed": "Operation completed",
    "operation-failed": "Operation failed",
    "operation-canceled": "Operation canceled",
    "session-invalidated": "Session invalidated",
  };
  return labels[raw] || raw.replaceAll("-", " ") || "Operation running";
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
