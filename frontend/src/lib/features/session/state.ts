import { derived, writable } from "svelte/store";

import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";

import type { SessionStatus } from "$lib/session-model";

export const devices = writable<DeviceReport[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<DeviceReport | null>(null);
export const selectionVersion = writable(0);
export const sessionStatus = writable<SessionStatus>({ state: "idle", selectedSelector: "", selectedDevice: null });
export const sessions = writable<SessionStatus[]>([]);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);
export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");
export const sessionProblem = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "stale" || $sessionStatus.state === "error");

export function resetSessionStateForTest() {
  devices.set([]);
  selectedSelector.set("");
  selectedDevice.set(null);
  selectionVersion.set(0);
  sessionStatus.set({ state: "idle", selectedSelector: "", selectedDevice: null });
  sessions.set([]);
}
