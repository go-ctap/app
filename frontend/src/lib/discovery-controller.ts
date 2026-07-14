import { get } from "svelte/store";

import type {
  DiscoveryChangedEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DiscoveryTrigger } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import { failureMessage, runtimeFailureFrom } from "./failure.js";
import {
  idleSessionStatus,
  reportForSelector,
  selectorFromDevice,
} from "./session-model.js";
import { selectToken } from "./session-controller.js";
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
  const previousDeviceCount = get(devices).length;
  const snapshot = envelope.snapshot;
  const nextDevices = snapshot ? snapshot.devices : get(devices);
  const nextSelectedDevice = snapshot && previousSelector
    ? reportForSelector(snapshot.devices, previousSelector)
    : get(selectedDevice);
  const selectedDeviceMissing = Boolean(snapshot && previousSelector && !nextSelectedDevice);
  const selectedDisconnected = Boolean(previousSelector && selectedDeviceMissing);
  const autoSelectSelector = snapshot
    && snapshot.devices.length > 0
    && (
      selectedDeviceMissing
      || (previousDeviceCount === 0 && !previousSelector)
    )
      ? selectorFromDevice(snapshot.devices[0])
      : "";

  if (snapshot) {
    devices.set(snapshot.devices);
  }

  if (selectedDeviceMissing) {
    invalidateSelectedSession();
    return {
      deviceCount: nextDevices.length,
      selectedDisconnected,
      autoSelectSelector,
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
    autoSelectSelector,
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
      message: failureMessage(envelope.error),
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

function recordDiscoveryRuntimeFailure(error: Failure) {
  setStatusOutcome({
    tone: "error",
    title: m.discovery_issue(),
    message: failureMessage(error),
  });
}

export async function handleDiscoveryChanged(envelope: DiscoveryChangedEnvelope) {
  const result = applyTopology(envelope);
  if (!envelope.error && result.autoSelectSelector) {
    await selectToken(result.autoSelectSelector);
    return;
  }
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
    recordDiscoveryRuntimeFailure(runtimeFailureFrom(error));
    return null;
  }
}

export async function refreshDiscovery() {
  try {
    await api.refreshDiscovery();
  } catch (error) {
    recordDiscoveryRuntimeFailure(runtimeFailureFrom(error));
  }
}
