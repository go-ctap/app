import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { RuntimeErrorEnvelope, SessionID, SessionSnapshot } from "../../bindings/github.com/go-ctap/kit/service";

export type SessionState = "idle" | "opening" | "ready" | "running" | "error";

export type SessionStatus = {
  sessionId?: SessionID;
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  deviceId?: string;
  deviceLabel?: string;
  state: SessionState;
  activeOperation?: string;
  openedAt?: string;
  updatedAt?: string;
  error?: RuntimeErrorEnvelope | null;
};

export type Discovery = {
  devices: DeviceReport[];
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  session: SessionStatus;
  error?: RuntimeErrorEnvelope | null;
};

export function selectorFromDevice(device: DeviceReport | null | undefined) {
  return device?.deviceId || device?.ordinalAlias || "";
}

export function reportForSelector(devices: DeviceReport[], selector: string) {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return null;
  return devices.find((device) => device.deviceId === requestedSelector || device.ordinalAlias === requestedSelector) || null;
}

export function labelForDevice(device: DeviceReport) {
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId;
  return [name, device.serial].filter(Boolean).join(" · ");
}

export function idleSessionStatus(
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  state: SessionState = "idle",
  error?: RuntimeErrorEnvelope | null,
): SessionStatus {
  const status: SessionStatus = {
    selectedSelector,
    selectedDevice,
    state,
  };
  if (selectedDevice) {
    status.deviceId = selectedDevice.deviceId;
    status.deviceLabel = labelForDevice(selectedDevice);
  }
  if (error) status.error = error;
  return status;
}

export function sessionIsOpen(snapshot: SessionSnapshot) {
  return !snapshot.info.closed;
}

export function sessionMatches(snapshot: SessionSnapshot, selector: string) {
  const requestedSelector = selector.trim();
  return sessionIsOpen(snapshot) && (snapshot.info.device.deviceId === requestedSelector || snapshot.info.device.ordinalAlias === requestedSelector);
}

export function statusFromSession(
  snapshot: SessionSnapshot,
  stateOverride?: SessionState,
  error?: RuntimeErrorEnvelope | null,
): SessionStatus {
  const device = snapshot.info.device;
  const status: SessionStatus = {
    sessionId: snapshot.id,
    selectedSelector: selectorFromDevice(device),
    selectedDevice: device,
    deviceId: device.deviceId,
    deviceLabel: labelForDevice(device),
    state: stateOverride || (snapshot.running ? "running" : "ready"),
    openedAt: String(snapshot.openedAt),
    updatedAt: String(snapshot.updatedAt),
  };
  if (snapshot.running) status.activeOperation = "";
  if (error) status.error = error;
  return status;
}
