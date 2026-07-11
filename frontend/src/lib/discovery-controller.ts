import { get } from "svelte/store";

import type {
  DiscoveryChangedEnvelope,
  RuntimeErrorEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessions,
  sessionStatus,
} from "./features/session/state.js";
import { appError } from "./features/workbench/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import {
  idleSessionStatus,
  labelForDevice,
  reportForSelector,
  selectorFromDevice,
} from "./session-model.js";
import {
  appendLogEntry,
  clearWorkbenchScreenCaches,
  finishOperation,
  setStatusOutcome,
} from "./workbench-state.js";

type DiscoveryTone = "error" | "info" | "warning";

function invalidateSelectedSession() {
  clearWorkbenchScreenCaches();
  finishOperation();
  selectedSelector.set("");
  selectedDevice.set(null);
  sessions.set([]);
  sessionStatus.set(idleSessionStatus("", null));
}

function applyTopology(envelope: DiscoveryChangedEnvelope) {
  const previousSelector = get(selectedSelector);
  const previousSession = get(sessionStatus);
  const snapshot = envelope.snapshot;
  const nextDevices = snapshot ? snapshot.devices : get(devices);
  const nextSelectedDevice = snapshot && previousSelector
    ? reportForSelector(snapshot.devices, previousSelector)
    : get(selectedDevice);
  const selectedDeviceMissing = Boolean(snapshot && previousSelector && !nextSelectedDevice);
  const selectedDisconnected = Boolean(previousSelector && selectedDeviceMissing);

  if (snapshot) {
    devices.set(snapshot.devices);
  }

  if (selectedDeviceMissing) {
    invalidateSelectedSession();
    return {
      deviceCount: nextDevices.length,
      previousSelector,
      selectedDisconnected,
    };
  }

  if (snapshot && previousSelector && nextSelectedDevice) {
    const canonicalSelector = selectorFromDevice(nextSelectedDevice);
    selectedSelector.set(canonicalSelector);
    selectedDevice.set(nextSelectedDevice);
    sessionStatus.set({
      ...previousSession,
      selectedSelector: canonicalSelector,
      selectedDevice: nextSelectedDevice,
      deviceId: nextSelectedDevice.deviceId,
      deviceLabel: labelForDevice(nextSelectedDevice),
    });
  }

  return {
    deviceCount: nextDevices.length,
    previousSelector,
    selectedDisconnected,
  };
}

function discoveryPresentation(
  envelope: DiscoveryChangedEnvelope,
  selectedDisconnected: boolean,
  deviceCount: number,
): { tone: DiscoveryTone; title: string; message: string } {
  if (envelope.error) {
    return {
      tone: "error",
      title: m.discovery_issue(),
      message: envelope.error.message,
    };
  }
  if (selectedDisconnected) {
    return {
      tone: "warning",
      title: m.selected_authenticator_disconnected(),
      message: m.selected_authenticator_disconnected_message(),
    };
  }
  return {
    tone: "info",
    title: m.authenticator_list_updated(),
    message: m.authenticators_found({ count: deviceCount }),
  };
}

function recordDiscoveryOutcome(
  envelope: DiscoveryChangedEnvelope,
  presentation: { tone: DiscoveryTone; title: string; message: string },
  selector: string,
  deviceCount: number,
) {
  const logEntryId = appendLogEntry({
    tone: presentation.tone,
    source: "discovery",
    title: presentation.title,
    message: presentation.message,
    selector,
    data: {
      trigger: envelope.trigger,
      deviceCount,
      snapshotApplied: Boolean(envelope.snapshot),
      error: envelope.error,
    },
  });
  setStatusOutcome({
    ...presentation,
    logEntryId,
  });
}

function recordDiscoveryRuntimeFailure(error: RuntimeErrorEnvelope) {
  appError.set(error.message);
  const logEntryId = appendLogEntry({
    tone: "error",
    source: "discovery",
    title: m.discovery_issue(),
    message: error.message,
    selector: get(selectedSelector),
    data: { error },
  });
  setStatusOutcome({
    tone: "error",
    title: m.discovery_issue(),
    message: error.message,
    logEntryId,
  });
}

export function handleDiscoveryChanged(envelope: DiscoveryChangedEnvelope) {
  const result = applyTopology(envelope);
  const presentation = discoveryPresentation(envelope, result.selectedDisconnected, result.deviceCount);
  recordDiscoveryOutcome(envelope, presentation, result.previousSelector, result.deviceCount);
}

export async function startDiscoveryMonitoring() {
  try {
    return await api.startDiscoveryMonitoring();
  } catch (error) {
    recordDiscoveryRuntimeFailure(runtimeErrorFrom(error));
    return null;
  }
}

export async function refreshDiscovery() {
  try {
    await api.refreshDiscovery();
  } catch (error) {
    recordDiscoveryRuntimeFailure(runtimeErrorFrom(error));
  }
}
