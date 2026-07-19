import { derived, writable } from "svelte/store";

import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";
import type { InspectEnvelope } from "../../../../bindings/fidobench/service";

import { idleLoadState, type LoadState } from "$lib/load-state";
import type { AuthenticatorStatus } from "$lib/authenticator-model";

export const devices = writable<DeviceReport[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<DeviceReport | null>(null);
export const authenticatorStatus = writable<AuthenticatorStatus>({ state: "idle" });
export const authenticatorInspection = writable<LoadState<InspectEnvelope>>(idleLoadState());

export const authenticatorBusy = derived(authenticatorStatus, ($authenticatorStatus) => $authenticatorStatus.state === "opening" || $authenticatorStatus.state === "running");

export function resetAuthenticatorStateForTest() {
  devices.set([]);
  selectedSelector.set("");
  selectedDevice.set(null);
  authenticatorStatus.set({ state: "idle" });
  authenticatorInspection.set(idleLoadState());
}
