import { get } from "svelte/store";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import {
  api,
  idleSessionStatus,
  reportForSelector,
  runtimeErrorFrom,
  selectorFromDevice,
  sessionIsOpen,
  sessionMatches,
  statusFromSession,
  type Discovery,
  type SessionStatus,
} from "./api.js";
import {
  activeScreen,
  appError,
  devices as deviceStore,
  pendingInteraction,
  selectedSelector,
  sessions,
  sessionStatus,
  type ActiveScreen,
} from "./app-state.js";
import {
  beginLifecycleEpoch,
  isCurrentLifecycleEpoch,
} from "./controller-epochs.js";
import { cancelPendingInteraction } from "./interaction-controller.js";
import { invalidateOverviewLoads, maybeLoadOverview } from "./overview-controller.js";
import { currentSessionActiveOperationId } from "./session-boundary.js";
import {
  appendLogEntry,
  applyDiscovery,
  clearWorkbenchScreenCaches,
  finishOperation,
  setStatusOutcome,
} from "./workbench-state.js";
import { m } from "../paraglide/messages.js";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || m.unexpected_error());
}

function deviceSelection(devices: DeviceReport[], requestedSelector: string) {
  const device = reportForSelector(devices, requestedSelector);
  return {
    selectedDevice: device,
    selectedSelector: selectorFromDevice(device),
  };
}

function initialSelectorForDevices(devices: DeviceReport[], preferredSelector: string) {
  if (reportForSelector(devices, preferredSelector)) return preferredSelector;
  return devices.length === 1 ? selectorFromDevice(devices[0]) : "";
}

function retainedSelectorForDevices(devices: DeviceReport[], preferredSelector: string) {
  return reportForSelector(devices, preferredSelector) ? preferredSelector : "";
}

function discoverySnapshot(
  devices: DeviceReport[],
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  session: SessionStatus,
  error?: RuntimeErrorEnvelope | null,
): Discovery {
  const discovery: Discovery = {
    devices,
    selectedSelector,
    selectedDevice,
    session,
  };
  if (error) discovery.error = error;
  return discovery;
}

async function cancelActiveOperation() {
  const operationId = currentSessionActiveOperationId();
  if (!operationId) return;
  try {
    await api.cancelOperation({ operationId });
  } catch {
    // Closing the session remains the authoritative cleanup boundary.
  }
}

async function closeOpenSessions() {
  await cancelActiveOperation();
  await cancelPendingInteraction();
  const snapshots = await api.sessions();
  if (snapshots.some(sessionIsOpen)) {
    await api.closeAllSessions();
  }
  finishOperation();
}

async function openSessionForDevice(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, selector);
  if (!canonicalSelector || !selectedDevice) {
    await closeOpenSessions();
    return discoverySnapshot(devices, "", null, idleSessionStatus("", null));
  }

  const snapshots = await api.sessions();
  const openSessions = snapshots.filter(sessionIsOpen);
  const current = openSessions.find((snapshot) => sessionMatches(snapshot, canonicalSelector));
  if (current && openSessions.length === 1) {
    return discoverySnapshot(devices, canonicalSelector, current.info.device, statusFromSession(current));
  }

  await closeOpenSessions();
  const snapshot = await api.openSession({ selector: canonicalSelector });
  return discoverySnapshot(devices, canonicalSelector, snapshot.info.device, statusFromSession(snapshot));
}

async function closeSelection(devices: DeviceReport[] = get(deviceStore)): Promise<Discovery> {
  await closeOpenSessions();
  return discoverySnapshot(devices, "", null, idleSessionStatus("", null));
}

function selectionMessage(discovery: Discovery, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : fallback || m.selection_updated();
}

function selectedDeviceSummary(discovery: Discovery) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : undefined;
}

async function selectFromDevices(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return closeSelection(devices);

  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, requestedSelector);
  if (!canonicalSelector || !selectedDevice) return closeSelection(devices);

  try {
    return await openSessionForDevice(devices, canonicalSelector);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    return discoverySnapshot(
      devices,
      canonicalSelector,
      selectedDevice,
      idleSessionStatus(canonicalSelector, selectedDevice, "error", runtimeError),
      runtimeError,
    );
  }
}

async function discoverAndSelect(preferredSelector: string, autoSelectSingle = false): Promise<Discovery> {
  const discoveredDevices = await api.discover();
  const selector = autoSelectSingle
    ? initialSelectorForDevices(discoveredDevices, preferredSelector)
    : retainedSelectorForDevices(discoveredDevices, preferredSelector);
  return selectFromDevices(discoveredDevices, selector);
}

export async function bootstrap() {
  const epoch = beginLifecycleEpoch();
  try {
    const discovery = await discoverAndSelect(get(selectedSelector), true);
    if (!isCurrentLifecycleEpoch(epoch)) return;
    applyDiscovery(discovery);
    await maybeLoadOverview();
  } catch (error) {
    if (isCurrentLifecycleEpoch(epoch)) {
      appError.set(messageFromError(error));
    }
  }
}

export async function refreshDiscovery() {
  const epoch = beginLifecycleEpoch();
  try {
    const previous = get(selectedSelector);
    const discovery = await discoverAndSelect(previous);
    if (!isCurrentLifecycleEpoch(epoch)) return;
    applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "discovery",
      title: discovery.error ? m.discovery_issue() : m.discovery_refreshed(),
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices.length }),
      selector: discovery.selectedSelector || previous,
      data: {
        deviceCount: discovery.devices.length,
        selectedSelector: discovery.selectedSelector || "",
        session: { state: discovery.session.state },
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.discovery_issue() : m.discovery_refreshed(),
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices.length }),
      logEntryId,
    });
    await maybeLoadOverview();
  } catch (error) {
    if (isCurrentLifecycleEpoch(epoch)) {
      appError.set(messageFromError(error));
    }
  }
}

export async function selectToken(selector: string) {
  const epoch = beginLifecycleEpoch();
  invalidateOverviewLoads();
  clearWorkbenchScreenCaches();
  try {
    if (selector.trim()) {
      const device = reportForSelector(get(deviceStore), selector);
      sessionStatus.set(idleSessionStatus(selector.trim(), device, "opening"));
    }
    const discovery = await selectFromDevices(get(deviceStore), selector);
    if (!isCurrentLifecycleEpoch(epoch)) return;
    applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "selection",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: selectionMessage(discovery, selector),
      selector: discovery.selectedSelector || selector,
      data: {
        selectedSelector: discovery.selectedSelector || selector,
        selectedDevice: selectedDeviceSummary(discovery),
        session: { state: discovery.session.state },
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: selectionMessage(discovery, selector),
      logEntryId,
    });
    await maybeLoadOverview();
  } catch (error) {
    if (isCurrentLifecycleEpoch(epoch)) {
      appError.set(messageFromError(error));
    }
  }
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (get(activeScreen) === screen) return;
  activeScreen.set(screen);
  await maybeLoadOverview();
}

export async function shutdownWorkbench() {
  try {
    await closeOpenSessions();
  } finally {
    const selector = get(selectedSelector);
    sessions.set([]);
    sessionStatus.set(idleSessionStatus(selector, reportForSelector(get(deviceStore), selector), selector ? "closed" : "idle"));
    pendingInteraction.set(null);
    finishOperation();
  }
}
