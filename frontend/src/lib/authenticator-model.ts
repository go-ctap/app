import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { SelectionID } from "../../bindings/telesma/service";

import { deviceName } from "./format.js";

export type AuthenticatorState = "idle" | "opening" | "ready" | "running" | "error";

export type AuthenticatorStatus = {
  selectionId?: SelectionID;
  state: AuthenticatorState;
  error?: Failure | null;
};

export type Discovery = {
  devices: DeviceReport[];
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  authenticator: AuthenticatorStatus;
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

export function idleAuthenticatorStatus(state: AuthenticatorState = "idle", error?: Failure | null): AuthenticatorStatus {
  const status: AuthenticatorStatus = { state };
  if (error) status.error = error;
  return status;
}
