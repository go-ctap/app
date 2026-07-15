import { get } from "svelte/store";

import { Category, Code, Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

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
import { deviceName } from "./format.js";
import { maybeLoadLargeBlobs } from "./largeblobs-controller.js";
import { maybeLoadOverview } from "./overview-controller.js";
import { maybeLoadPasskeys } from "./passkeys-controller.js";
import { maybeLoadSecurity } from "./security-controller.js";
import { failureMessage, runtimeFailureFrom } from "./failure.js";
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

function initialSelectorForDevices(devices: DeviceReport[]) {
  return selectorFromDevice(devices[0]);
}

function discoverySnapshot(
  devices: DeviceReport[],
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  session: SessionStatus,
  error?: Failure | null,
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

async function closeOpenSessions(options: { continueAfterTransportCloseFailure?: boolean } = {}) {
  try {
    await api.closeAllSessions();
  } catch (error) {
    const closeFailure = runtimeFailureFrom(error);
    if (!options.continueAfterTransportCloseFailure || closeFailure.code !== Code.CodeTransportFailure) {
      throw error;
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

  // CloseAllSessions detaches every managed session before closing the
  // underlying handles. A transport error from that final physical close is
  // still logged, but must not prevent opening the newly selected device.
  await closeOpenSessions({ continueAfterTransportCloseFailure: true });
  const snapshot = await api.openSession({ selector: canonicalSelector });
  return discoverySnapshot(devices, canonicalSelector, snapshot.info.device, statusFromSession(snapshot));
}

async function closeSelection(devices: DeviceReport[] = get(deviceStore)): Promise<Discovery> {
  await closeOpenSessions();
  return discoverySnapshot(devices, "", null, idleSessionStatus());
}

function selectionMessage(discovery: Discovery, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? deviceName(device) : fallback || m.selection_updated();
}

async function selectFromDevices(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return closeSelection(devices);

  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, requestedSelector);
  if (!canonicalSelector || !selectedDevice) return closeSelection(devices);

  try {
    return await openSessionForDevice(devices, canonicalSelector);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
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
 * screen-state boundary. Callers can then rerun their own forced operation
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
    const error = new Failure({
      code: Code.CodeDeviceUnavailable,
      category: Category.CategoryInvalidState,
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

async function discoverAndSelect(): Promise<Discovery> {
  const discoveredDevices = await api.discover();
  const selector = initialSelectorForDevices(discoveredDevices);
  return selectFromDevices(discoveredDevices, selector);
}

export async function bootstrap() {
  try {
    const discovery = await discoverAndSelect();
    applyDiscovery(discovery);
    await maybeLoadOverview();
    await maybeLoadPasskeys();
    await maybeLoadLargeBlobs();
    await maybeLoadSecurity();
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    sessionStatus.set(idleSessionStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.discovery_issue(), message: failureMessage(runtimeError) });
  }
}

export async function selectToken(selector: string) {
  const requestedSelector = selector.trim();
  const currentSession = get(sessionStatus);
  if (
    requestedSelector
    && requestedSelector === get(selectedSelector).trim()
    && (currentSession.state === "ready" || currentSession.state === "running")
    && currentSession.sessionId
  ) return;

  clearWorkbenchScreenCaches();
  try {
    if (requestedSelector) {
      sessionStatus.set(idleSessionStatus("opening"));
    }
    const discovery = await selectFromDevices(get(deviceStore), selector);
    applyDiscovery(discovery);
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: discovery.error
        ? failureMessage(discovery.error)
        : selectionMessage(discovery, selector),
    });
    await maybeLoadOverview();
    await maybeLoadPasskeys();
    await maybeLoadLargeBlobs();
    await maybeLoadSecurity();
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    sessionStatus.set(idleSessionStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.token_selection_issue(), message: failureMessage(runtimeError) });
  }
}

export async function navigateToScreen(screen: ActiveScreen) {
  if (get(activeScreen) === screen) return;
  activeScreen.set(screen);
  await maybeLoadOverview();
  await maybeLoadPasskeys();
  await maybeLoadLargeBlobs();
  await maybeLoadSecurity();
}

/**
 * Factory reset invalidates the selected authenticator as an application
 * session boundary. Close the old session, clear selection-owned state, then
 * apply the normal startup rule: auto-open the first discovered authenticator.
 */
export async function rediscoverAfterFactoryReset(): Promise<Failure | null> {
  let closeError: Failure | null = null;
  try {
    // Reset invalidates the old handle. Close service ownership without first
    // reading session snapshots, and never reuse a pre-reset open snapshot.
    await api.closeAllSessions();
  } catch (error) {
    closeError = runtimeFailureFrom(error);
  }

  clearWorkbenchScreenCaches();
  pendingInteraction.set(null);
  finishOperation();
  applyDiscovery(discoverySnapshot([], "", null, idleSessionStatus()));

  try {
    const discoveredDevices = await api.discover();
    let discovery = discoverySnapshot(discoveredDevices, "", null, idleSessionStatus());

    if (discoveredDevices.length > 0) {
      const selection = deviceSelection(discoveredDevices, selectorFromDevice(discoveredDevices[0]));
      if (selection.selectedSelector && selection.selectedDevice) {
        try {
          const snapshot = await api.openSession({ selector: selection.selectedSelector });
          discovery = discoverySnapshot(
            discoveredDevices,
            selection.selectedSelector,
            snapshot.info.device,
            statusFromSession(snapshot),
          );
        } catch (error) {
          const runtimeError = runtimeFailureFrom(error);
          discovery = discoverySnapshot(
            discoveredDevices,
            selection.selectedSelector,
            selection.selectedDevice,
            idleSessionStatus("error", runtimeError),
            runtimeError,
          );
        }
      }
    }

    applyDiscovery(discovery);
    return discovery.error ?? closeError;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    applyDiscovery(discoverySnapshot(
      [],
      "",
      null,
      idleSessionStatus("error", runtimeError),
      runtimeError,
    ));
    return runtimeError;
  }
}

export async function shutdownWorkbench() {
  try {
    await closeOpenSessions();
  } finally {
    clearWorkbenchScreenCaches();
    sessionStatus.set(idleSessionStatus());
    pendingInteraction.set(null);
    finishOperation();
  }
}
