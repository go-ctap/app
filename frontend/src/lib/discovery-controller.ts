import { get } from "svelte/store";

import type {
  DiscoveryChangedEnvelope,
  RuntimeErrorEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import { DiscoveryTrigger } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import {
  idleSessionStatus,
  reportForSelector,
  selectorFromDevice,
} from "./session-model.js";
import {
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
  sessionStatus.set(idleSessionStatus());
}

function applyTopology(envelope: DiscoveryChangedEnvelope) {
  const previousSelector = get(selectedSelector);
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
      selectedDisconnected,
    };
  }

  if (snapshot && previousSelector && nextSelectedDevice) {
    const canonicalSelector = selectorFromDevice(nextSelectedDevice);
    selectedSelector.set(canonicalSelector);
    selectedDevice.set(nextSelectedDevice);
  }

  return {
    deviceCount: nextDevices.length,
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

function recordDiscoveryOutcome(presentation: { tone: DiscoveryTone; title: string; message: string }) {
  setStatusOutcome(presentation);
}

function recordDiscoveryRuntimeFailure(error: RuntimeErrorEnvelope) {
  setStatusOutcome({
    tone: "error",
    title: m.discovery_issue(),
    message: error.message,
  });
}

export function handleDiscoveryChanged(envelope: DiscoveryChangedEnvelope) {
  const result = applyTopology(envelope);
  if (
    envelope.trigger === DiscoveryTrigger.DiscoveryTriggerEnriched
    && !envelope.error
    && !result.selectedDisconnected
  ) return;

  const presentation = discoveryPresentation(envelope, result.selectedDisconnected, result.deviceCount);
  recordDiscoveryOutcome(presentation);
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
