import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { SelectionID } from "../../bindings/telesma/service";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

export type AuthenticatorState = "idle" | "opening" | "ready" | "error";

export type AuthenticatorStatus = {
  selectionId?: SelectionID;
  state: AuthenticatorState;
  error?: Failure | null;
};

export function selectorFromDevice(device: DeviceReport | null | undefined) {
  return device?.attachment.id ?? "";
}

export function reportForSelector(devices: DeviceReport[], selector: string) {
  const requestedSelector = selector.trim();

  if (!requestedSelector) return null;

  return devices.find((device) => device.attachment.id === requestedSelector) ?? null;
}

export function idleAuthenticatorStatus(
  state: AuthenticatorState = "idle",
  error?: Failure | null,
): AuthenticatorStatus {
  const status: AuthenticatorStatus = { state };

  if (error) status.error = error;

  return status;
}
