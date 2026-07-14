import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { SessionID, SessionSnapshot } from "../../bindings/github.com/go-ctap/kit/service";

import { deviceName } from "./format.js";

export type SessionState = "idle" | "opening" | "ready" | "running" | "error";

export type SessionStatus = {
  sessionId?: SessionID;
  state: SessionState;
  error?: Failure | null;
};

export type Discovery = {
  devices: DeviceReport[];
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  session: SessionStatus;
  error?: Failure | null;
};

export function selectorFromDevice(device: DeviceReport | null | undefined) {
  return device?.fingerprint || device?.ordinalAlias || "";
}

export function reportForSelector(devices: DeviceReport[], selector: string) {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return null;
  return devices.find((device) => device.fingerprint === requestedSelector || device.ordinalAlias === requestedSelector) || null;
}

export function labelForDevice(device: DeviceReport) {
  const name = deviceName(device);
  return [name, device.metadata?.serial || device.serial].filter(Boolean).join(" · ");
}

export function idleSessionStatus(state: SessionState = "idle", error?: Failure | null): SessionStatus {
  const status: SessionStatus = { state };
  if (error) status.error = error;
  return status;
}

export function sessionIsOpen(snapshot: SessionSnapshot) {
  return !snapshot.info.closed;
}

export function sessionMatches(snapshot: SessionSnapshot, selector: string) {
  const requestedSelector = selector.trim();
  return sessionIsOpen(snapshot) && (snapshot.info.device.fingerprint === requestedSelector || snapshot.info.device.ordinalAlias === requestedSelector);
}

export function statusFromSession(
  snapshot: SessionSnapshot,
  stateOverride?: SessionState,
  error?: Failure | null,
): SessionStatus {
  const status: SessionStatus = {
    sessionId: snapshot.id,
    state: stateOverride || (snapshot.running ? "running" : "ready"),
  };
  if (error) status.error = error;
  return status;
}
