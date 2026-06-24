import { get } from "svelte/store";

import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import { pendingInteraction } from "./features/interaction/state.js";
import {
  devices as deviceStore,
  selectedSelector,
  sessions,
  sessionStatus,
} from "./features/session/state.js";
import {
  activeScreen,
  appError,
  type ActiveScreen,
} from "./features/workbench/state.js";
import { maybeLoadOverview } from "./overview-controller.js";
import { maybeLoadPasskeys } from "./passkeys-controller.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import {
  idleSessionStatus,
  reportForSelector,
  selectorFromDevice,
  sessionIsOpen,
  sessionMatches,
  statusFromSession,
  type Discovery,
  type SessionStatus,
} from "./session-model.js";
import {
  appendLogEntry,
  applyDiscovery,
  clearWorkbenchScreenCaches,
  finishOperation,
  setStatusOutcome,
} from "./workbench-state.js";

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

async function closeOpenSessions() {
  try {
    const snapshots = await api.sessions();
    if (snapshots.some(sessionIsOpen)) {
      await api.closeAllSessions();
    }
  } finally {
    finishOperation();
  }
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
  try {
    const discovery = await discoverAndSelect(get(selectedSelector), true);
    applyDiscovery(discovery);
    await maybeLoadOverview();
    await maybeLoadPasskeys();
  } catch (error) {
    appError.set(messageFromError(error));
  }
}

export async function refreshDiscovery() {
  try {
    const previous = get(selectedSelector);
    const discovery = await discoverAndSelect(previous);
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
    await maybeLoadPasskeys();
  } catch (error) {
    appError.set(messageFromError(error));
  }
}

export async function selectToken(selector: string) {
  clearWorkbenchScreenCaches();
  try {
    if (selector.trim()) {
      const device = reportForSelector(get(deviceStore), selector);
      sessionStatus.set(idleSessionStatus(selector.trim(), device, "opening"));
    }
    const discovery = await selectFromDevices(get(deviceStore), selector);
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
    await maybeLoadPasskeys();
  } catch (error) {
    appError.set(messageFromError(error));
  }
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (get(activeScreen) === screen) return;
  activeScreen.set(screen);
  await maybeLoadOverview();
  await maybeLoadPasskeys();
}

export async function shutdownWorkbench() {
  try {
    await closeOpenSessions();
  } finally {
    sessions.set([]);
    sessionStatus.set(idleSessionStatus("", null));
    pendingInteraction.set(null);
    finishOperation();
  }
}
