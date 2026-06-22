import { readonly } from "svelte/store";
import * as session from "./features/session/state.js";
import * as workbench from "./features/workbench/state.js";
import * as interaction from "./features/interaction/state.js";
import * as overview from "./features/overview/state.js";

export {
  type ActiveOperation,
  type ActiveScreen,
  type StatusBarAction,
  type StatusBarOutcome,
  type StatusBarState,
  type WorkbenchLogEntry,
} from "./features/workbench/state.js";
export {
  type LoadState,
  type LoadStateName,
  type MDSLookupViewState,
} from "./features/overview/state.js";

export {
  sanitizeLogData,
} from "./workbench-state.js";

export const devices = readonly(session.devices);
export const selectedSelector = readonly(session.selectedSelector);
export const selectedDevice = readonly(session.selectedDevice);
export const selectionVersion = readonly(session.selectionVersion);
export const sessionStatus = readonly(session.sessionStatus);
export const sessions = readonly(session.sessions);
export const hasSelection = readonly(session.hasSelection);
export const sessionBusy = readonly(session.sessionBusy);
export const sessionProblem = readonly(session.sessionProblem);

export const activeScreen = readonly(workbench.activeScreen);
export const operationStatus = readonly(workbench.operationStatus);
export const statusBar = readonly(workbench.statusBar);
export const workbenchLog = readonly(workbench.workbenchLog);
export const selectedLogEntryId = readonly(workbench.selectedLogEntryId);
export const appError = readonly(workbench.appError);

export const overviewInspection = readonly(overview.overviewInspection);
export const overviewBioSensor = readonly(overview.overviewBioSensor);
export const overviewMDS = readonly(overview.overviewMDS);
export const overviewEnvelope = overview.overviewEnvelope;
export const overviewBioSensorEnvelope = overview.overviewBioSensorEnvelope;
export const overviewMDSLookup = overview.overviewMDSLookup;
export const overviewLoading = overview.overviewLoading;
export const overviewMDSLoading = overview.overviewMDSLoading;

export const pendingInteraction = readonly(interaction.pendingInteraction);
