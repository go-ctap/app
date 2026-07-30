import { derived, writable } from "svelte/store";

import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";
import type { InspectEnvelope } from "../../../../bindings/telesma/service";

import { idleLoadState, type LoadState } from "$lib/load-state";
import type { AuthenticatorStatus } from "$lib/authenticator-model";
import { reportForSelector } from "$lib/authenticator-model";
import { statusBar } from "$lib/features/workbench/state";

export type AuthenticatorSession = {
  devices: DeviceReport[];
  selectedAttachmentId: string;
  authenticator: AuthenticatorStatus;
};

export const authenticatorSession = writable<AuthenticatorSession>({
  devices: [],
  selectedAttachmentId: "",
  authenticator: { state: "idle" },
});

export const devices = derived(authenticatorSession, ($session) => $session.devices);

export const selectedSelector = derived(
  authenticatorSession,
  ($session) => $session.selectedAttachmentId,
);

export const selectedDevice = derived(authenticatorSession, ($session) =>
  reportForSelector($session.devices, $session.selectedAttachmentId),
);

export const authenticatorStatus = derived(
  authenticatorSession,
  ($session) => $session.authenticator,
);

export const authenticatorInspection = writable<LoadState<InspectEnvelope>>(idleLoadState());

export const authenticatorBusy = derived(
  [authenticatorSession, statusBar],
  ([$session, $statusBar]) =>
    $session.authenticator.state === "opening" || Boolean($statusBar.activeOperation),
);

export function resetAuthenticatorDeviceState() {
  authenticatorInspection.set(idleLoadState());
}

export function resetAuthenticatorStateForTest() {
  authenticatorSession.set({
    devices: [],
    selectedAttachmentId: "",
    authenticator: { state: "idle" },
  });
  resetAuthenticatorDeviceState();
}
