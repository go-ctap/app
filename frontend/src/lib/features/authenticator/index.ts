import { readonly } from "svelte/store";

import * as state from "$lib/features/authenticator/state.js";

export const devices = readonly(state.devices);

export const selectedSelector = readonly(state.selectedSelector);

export const selectedDevice = readonly(state.selectedDevice);

export const authenticatorStatus = readonly(state.authenticatorStatus);

export const authenticatorInspection = readonly(state.authenticatorInspection);

export const authenticatorBusy = readonly(state.authenticatorBusy);

export { rediscoverAfterFactoryReset, shutdownWorkbench } from "$lib/authenticator-controller.js";
