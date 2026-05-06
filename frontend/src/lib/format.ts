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
