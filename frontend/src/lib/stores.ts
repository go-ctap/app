import { readonly } from "svelte/store";
import * as session from "./features/session/state.js";
import * as workbench from "./features/workbench/state.js";
import * as interaction from "./features/interaction/state.js";
import * as overview from "./features/overview/state.js";

export {
  type ActiveScreen,
  type StatusBarState,
} from "./features/workbench/state.js";

export const devices = readonly(session.devices);
export const selectedSelector = readonly(session.selectedSelector);
export const selectedDevice = readonly(session.selectedDevice);
export const sessionStatus = readonly(session.sessionStatus);
export const sessionBusy = readonly(session.sessionBusy);

export const activeScreen = readonly(workbench.activeScreen);
export const statusBar = readonly(workbench.statusBar);
export const workbenchLog = readonly(workbench.workbenchLog);
export const appError = readonly(workbench.appError);

export const overviewBioSensor = readonly(overview.overviewBioSensor);
export const overviewMDS = readonly(overview.overviewMDS);
export const overviewEnvelope = overview.overviewEnvelope;
export const overviewBioSensorEnvelope = overview.overviewBioSensorEnvelope;
export const overviewLoading = overview.overviewLoading;
export const overviewMDSLoading = overview.overviewMDSLoading;

export const pendingInteraction = readonly(interaction.pendingInteraction);
