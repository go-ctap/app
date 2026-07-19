import { readonly } from "svelte/store";

import * as state from "./state.js";

export const devices = readonly(state.devices);
export const selectedSelector = readonly(state.selectedSelector);
export const selectedDevice = readonly(state.selectedDevice);
export const authenticatorStatus = readonly(state.authenticatorStatus);
export const authenticatorInspection = readonly(state.authenticatorInspection);
export const authenticatorBusy = readonly(state.authenticatorBusy);

export {
  ensureActiveSelectionReady,
  rediscoverAfterFactoryReset,
  shutdownWorkbench,
} from "../../authenticator-controller.js";
