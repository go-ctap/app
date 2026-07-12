import { get } from "svelte/store";

import { ErrorCategory } from "../../bindings/github.com/go-ctap/kit/model";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import { pendingInteraction } from "./features/interaction/state.js";
import {
  devices as deviceStore,
  selectedDevice as selectedDeviceStore,
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import { activeScreen, type ActiveScreen } from "./features/workbench/state.js";
import { maybeLoadLargeBlobs } from "./largeblobs-controller.js";
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
  applyDiscovery,
  clearWorkbenchScreenCaches,
  finishOperation,
  setStatusOutcome,
} from "./workbench-state.js";

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
    return discoverySnapshot(devices, "", null, idleSessionStatus());
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
  return discoverySnapshot(devices, "", null, idleSessionStatus());
}

function selectionMessage(discovery: Discovery, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : fallback || m.selection_updated();
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
      idleSessionStatus("error", runtimeError),
      runtimeError,
    );
  }
}

function recoverySelection(devices: DeviceReport[], selector: string) {
  return { devices, device: reportForSelector(devices, selector) };
}

/**
 * Restores the selected authenticator session without crossing the per-device
 * screen-state boundary. Callers can then retry their own forced operation
 * while last-known-good presentation data remains intact.
 */
export async function ensureSelectedSessionReady(): Promise<boolean> {
  const current = get(sessionStatus);
  if (current.state === "ready" && current.sessionId) return true;
  if (current.state === "opening" || current.state === "running") return false;

  const selector = get(selectedSelector).trim();
  if (!selector) return false;

  const recovery = recoverySelection(get(deviceStore), selector);
  if (!recovery.device) {
    const error = new RuntimeErrorEnvelope({
      category: ErrorCategory.ErrorTransportFailure,
      message: m.selected_authenticator_disconnected_message(),
    });
    applyDiscovery(discoverySnapshot(
      recovery.devices,
      selector,
      get(selectedDeviceStore),
      idleSessionStatus("error", error),
      error,
    ));
    return false;
  }

  pendingInteraction.set(null);
  sessionStatus.set(idleSessionStatus("opening"));
  const discovery = await selectFromDevices(recovery.devices, selector);
  applyDiscovery(discovery);

  const recovered = get(sessionStatus);
  return recovered.state === "ready" && Boolean(recovered.sessionId);
}

async function discoverAndSelect(preferredSelector: string): Promise<Discovery> {
  const discoveredDevices = await api.discover();
  const selector = initialSelectorForDevices(discoveredDevices, preferredSelector);
  return selectFromDevices(discoveredDevices, selector);
}

export async function bootstrap() {
  try {
    const discovery = await discoverAndSelect(get(selectedSelector));
    applyDiscovery(discovery);
    await maybeLoadOverview();
    await maybeLoadPasskeys();
    await maybeLoadLargeBlobs();
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    sessionStatus.set(idleSessionStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.discovery_issue(), message: runtimeError.message });
  }
}

export async function selectToken(selector: string) {
  clearWorkbenchScreenCaches();
  try {
    if (selector.trim()) {
      sessionStatus.set(idleSessionStatus("opening"));
    }
    const discovery = await selectFromDevices(get(deviceStore), selector);
    applyDiscovery(discovery);
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: selectionMessage(discovery, selector),
    });
    await maybeLoadOverview();
    await maybeLoadPasskeys();
    await maybeLoadLargeBlobs();
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    sessionStatus.set(idleSessionStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.token_selection_issue(), message: runtimeError.message });
  }
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (get(activeScreen) === screen) return;
  activeScreen.set(screen);
  await maybeLoadOverview();
  await maybeLoadPasskeys();
  await maybeLoadLargeBlobs();
}

export async function shutdownWorkbench() {
  try {
    await closeOpenSessions();
  } finally {
    sessionStatus.set(idleSessionStatus());
    pendingInteraction.set(null);
    finishOperation();
  }
}
