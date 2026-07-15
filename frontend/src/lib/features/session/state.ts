import { derived, writable } from "svelte/store";

import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";
import type { InspectEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

import { idleLoadState, type LoadState } from "$lib/load-state";
import type { SessionStatus } from "$lib/session-model";

export const devices = writable<DeviceReport[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<DeviceReport | null>(null);
export const sessionStatus = writable<SessionStatus>({ state: "idle" });
export const authenticatorInspection = writable<LoadState<InspectEnvelope>>(idleLoadState());

export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");

export function resetSessionStateForTest() {
  devices.set([]);
  selectedSelector.set("");
  selectedDevice.set(null);
  sessionStatus.set({ state: "idle" });
  authenticatorInspection.set(idleLoadState());
}
