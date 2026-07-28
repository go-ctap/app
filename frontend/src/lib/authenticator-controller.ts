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
  authenticatorStatus,
} from "./features/authenticator/state.js";
import { deviceName } from "./format.js";
import { failureMessage, runtimeFailureFrom } from "./failure.js";
import {
  idleAuthenticatorStatus,
  reportForSelector,
  selectorFromDevice,
  type Discovery,
  type AuthenticatorStatus,
} from "./authenticator-model.js";
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

function discoverySnapshot(
  devices: DeviceReport[],
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  authenticator: AuthenticatorStatus,
  error?: Failure | null,
): Discovery {
  const discovery: Discovery = {
    devices,
    selectedSelector,
    selectedDevice,
    authenticator,
  };
  if (error) discovery.error = error;
  return discovery;
}

async function setSelection(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, selector);
  if (!canonicalSelector || !selectedDevice) {
    await api.setSelection({ attachmentId: "" });
    return discoverySnapshot(get(deviceStore), "", null, idleAuthenticatorStatus());
  }

  const selection = await api.setSelection({ attachmentId: canonicalSelector });
  const snapshot = selection.selection!;
  // Inventory may publish identity while the authenticator opens.
  const currentDevices = get(deviceStore);
  const currentSelectedDevice = reportForSelector(currentDevices, canonicalSelector)!;
  return discoverySnapshot(currentDevices, canonicalSelector, currentSelectedDevice, {
    selectionId: snapshot.id,
    state: "ready",
  });
}

async function closeSelection(): Promise<Discovery> {
  await api.setSelection({ attachmentId: "" });
  return discoverySnapshot(get(deviceStore), "", null, idleAuthenticatorStatus());
}

function selectionMessage(discovery: Discovery, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? deviceName(device) : fallback || m.selection_updated();
}

async function selectFromDevices(devices: DeviceReport[], selector: string): Promise<Discovery> {
  deviceStore.set(devices);
  const requestedSelector = selector.trim();
  if (!requestedSelector) return closeSelection();

  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, requestedSelector);
  if (!canonicalSelector || !selectedDevice) return closeSelection();

  try {
    return await setSelection(devices, canonicalSelector);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    const currentDevices = get(deviceStore);
    return discoverySnapshot(
      currentDevices,
      canonicalSelector,
      reportForSelector(currentDevices, canonicalSelector),
      idleAuthenticatorStatus("error", runtimeError),
      runtimeError,
    );
  }
}

/**
 * Restores the selected authenticator without crossing the per-device
 * screen-state boundary. Callers can then rerun their own forced operation
 * while last-known-good presentation data remains intact.
 */
export async function ensureActiveSelectionReady(): Promise<boolean> {
  const current = get(authenticatorStatus);
  if (current.state === "ready" && current.selectionId) return true;
  if (current.state === "opening" || current.state === "running") return false;

  const selector = get(selectedSelector).trim();
  if (!selector) return false;

  const devices = get(deviceStore);
  if (!reportForSelector(devices, selector)) {
    const error = new Failure({
      code: Code.CodeDeviceUnavailable,
      category: Category.CategoryInvalidState,
    });
    applyDiscovery(discoverySnapshot(
      devices,
      selector,
      get(selectedDeviceStore),
      idleAuthenticatorStatus("error", error),
      error,
    ));
    return false;
  }

  pendingInteraction.set(null);
  authenticatorStatus.set(idleAuthenticatorStatus("opening"));
  const discovery = await selectFromDevices(devices, selector);
  applyDiscovery(discovery);

  const recovered = get(authenticatorStatus);
  return recovered.state === "ready" && Boolean(recovered.selectionId);
}

async function discoverAndSelect(): Promise<Discovery> {
  const discoveredDevices = await api.discover();
  return selectFromDevices(discoveredDevices, selectorFromDevice(discoveredDevices[0]));
}

export async function bootstrapAuthenticatorSession() {
  try {
    const discovery = await discoverAndSelect();
    applyDiscovery(discovery);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    authenticatorStatus.set(idleAuthenticatorStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.discovery_issue(), message: failureMessage(runtimeError) });
  }
}

export async function selectAuthenticatorSession(selector: string) {
  const requestedSelector = selector.trim();
  clearWorkbenchScreenCaches();
  pendingInteraction.set(null);
  try {
    if (requestedSelector) {
      authenticatorStatus.set(idleAuthenticatorStatus("opening"));
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
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    authenticatorStatus.set(idleAuthenticatorStatus("error", runtimeError));
    setStatusOutcome({ tone: "error", title: m.token_selection_issue(), message: failureMessage(runtimeError) });
  }
}

/**
 * Factory reset invalidates the selected authenticator as an application
 * boundary. Close the old authenticator, clear selection-owned state, then
 * apply the normal startup rule: auto-open the first discovered authenticator.
 */
export async function rediscoverAfterFactoryReset(): Promise<Failure | null> {
  let closeError: Failure | null = null;
  try {
    await api.setSelection({ attachmentId: "" });
  } catch (error) {
    closeError = runtimeFailureFrom(error);
  }

  clearWorkbenchScreenCaches();
  pendingInteraction.set(null);
  finishOperation();
  applyDiscovery(discoverySnapshot([], "", null, idleAuthenticatorStatus()));

  try {
    const discoveredDevices = await api.discover();
    const discovery = await selectFromDevices(discoveredDevices, selectorFromDevice(discoveredDevices[0]));

    applyDiscovery(discovery);
    return discovery.error ?? closeError;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    applyDiscovery(discoverySnapshot(
      [],
      "",
      null,
      idleAuthenticatorStatus("error", runtimeError),
      runtimeError,
    ));
    return runtimeError;
  }
}

export async function shutdownWorkbench() {
  try {
    await api.setSelection({ attachmentId: "" });
  } finally {
    clearWorkbenchScreenCaches();
    authenticatorStatus.set(idleAuthenticatorStatus());
    pendingInteraction.set(null);
    finishOperation();
  }
}
