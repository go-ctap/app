import { readonly } from "svelte/store";
import * as state from "./app-state.js";

export {
  type ActiveOperation,
  type ActiveScreen,
  type MDSLookupViewState,
  type StatusBarAction,
  type StatusBarOutcome,
  type StatusBarState,
  type WorkbenchLogEntry,
} from "./app-state.js";

export {
  sanitizeLogData,
} from "./workbench-state.js";

export const devices = readonly(state.devices);
export const selectedSelector = readonly(state.selectedSelector);
export const selectedDevice = readonly(state.selectedDevice);
export const selectionVersion = readonly(state.selectionVersion);
export const activeScreen = readonly(state.activeScreen);
export const operationStatus = readonly(state.operationStatus);
export const statusBar = readonly(state.statusBar);
export const workbenchLog = readonly(state.workbenchLog);
export const selectedLogEntryId = readonly(state.selectedLogEntryId);
export const sessionStatus = readonly(state.sessionStatus);
export const sessions = readonly(state.sessions);
export const overviewEnvelope = readonly(state.overviewEnvelope);
export const overviewBioSensorEnvelope = readonly(state.overviewBioSensorEnvelope);
export const overviewMDSLookup = readonly(state.overviewMDSLookup);
export const overviewLoading = readonly(state.overviewLoading);
export const overviewMDSLoading = readonly(state.overviewMDSLoading);
export const pendingInteraction = readonly(state.pendingInteraction);
export const appError = readonly(state.appError);
export const hasSelection = readonly(state.hasSelection);
export const sessionBusy = readonly(state.sessionBusy);
export const sessionProblem = readonly(state.sessionProblem);
