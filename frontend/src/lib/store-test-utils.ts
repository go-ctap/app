import {
  activeScreen,
  appError,
  devices,
  operationStatus,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSLoading,
  overviewMDSLookup,
  pendingInteraction,
  selectedDevice,
  selectedLogEntryId,
  selectedSelector,
  selectionVersion,
  sessions,
  sessionStatus,
  statusBar,
  workbenchLog,
} from "./app-state.js";

export function resetAppStateForTest() {
  activeScreen.set("overview");
  appError.set(null);
  devices.set([]);
  operationStatus.set(null);
  overviewBioSensorEnvelope.set(null);
  overviewEnvelope.set(null);
  overviewLoading.set(false);
  overviewMDSLoading.set(false);
  overviewMDSLookup.set(null);
  pendingInteraction.set(null);
  selectedDevice.set(null);
  selectedLogEntryId.set("");
  selectedSelector.set("");
  selectionVersion.set(0);
  sessionStatus.set({ state: "idle", selectedSelector: "", selectedDevice: null });
  sessions.set([]);
  statusBar.set({ activeOperation: null, lastOutcome: null, actions: [] });
  workbenchLog.set([]);
}
