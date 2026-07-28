import { get } from "svelte/store";

import type {
  DiscoveryChangedEnvelope,
} from "../../bindings/telesma/service";
import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { InventoryTrigger } from "../../bindings/github.com/go-ctap/kit";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  authenticatorStatus,
} from "./features/authenticator/state.js";
import { failureMessage, runtimeFailureFrom } from "./failure.js";
import {
  idleAuthenticatorStatus,
  reportForSelector,
  selectorFromDevice,
} from "./authenticator-model.js";
import { selectAuthenticatorSession } from "./authenticator-controller.js";
import { operationRecovery } from "./operation-recovery.js";
import { selectToken } from "./workbench-controller.js";
import {
  clearWorkbenchScreenCaches,
  finishOperation,
  setStatusOutcome,
} from "./workbench-state.js";

type DiscoveryTone = "error" | "info" | "warning";

function invalidateActiveSelection() {
  clearWorkbenchScreenCaches();
  finishOperation();
  selectedSelector.set("");
  selectedDevice.set(null);
  authenticatorStatus.set(idleAuthenticatorStatus());
}

function applyTopology(envelope: DiscoveryChangedEnvelope) {
  const previousSelector = get(selectedSelector);
  const snapshot = envelope.snapshot;
  const nextDevices = snapshot ? snapshot.devices : get(devices);
  const nextSelectedDevice = snapshot && previousSelector
    ? reportForSelector(snapshot.devices, previousSelector)
    : get(selectedDevice);
  const selectionOpening = get(authenticatorStatus).state === "opening";
  const selectedDeviceMissing = Boolean(snapshot && previousSelector && !nextSelectedDevice);
  const selectedDisconnected = Boolean(previousSelector && selectedDeviceMissing);
  const recoverySmartCard = get(operationRecovery) && snapshot
    ? snapshot.devices.find((device) => device.attachment.transport === Mode.ModeSmartCard)
    : null;
  const recoverySelector = recoverySmartCard
    && nextSelectedDevice?.attachment.transport !== Mode.ModeSmartCard
      ? selectorFromDevice(recoverySmartCard)
      : "";
  const ordinarySelector = snapshot
    && snapshot.devices.length > 0
    && (
      selectedDeviceMissing
      || (!previousSelector && !selectionOpening)
    )
      ? selectorFromDevice(snapshot.devices[0])
      : "";
  const autoSelectSelector = recoverySelector || ordinarySelector;

  if (snapshot) {
    devices.set(snapshot.devices);
  }

  if (selectedDeviceMissing) {
    invalidateActiveSelection();
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
    if (get(operationRecovery)) {
      await selectAuthenticatorSession(result.autoSelectSelector);
    } else {
      await selectToken(result.autoSelectSelector);
    }
    return;
  }
  if (
    envelope.trigger === InventoryTrigger.InventoryTriggerIdentity
    && !envelope.error
    && !result.selectedDisconnected
  ) return;

  const presentation = discoveryPresentation(envelope, result.selectedDisconnected, result.deviceCount);
  recordDiscoveryOutcome(presentation);
}

export async function refreshDiscovery() {
  try {
    await api.refreshDiscovery();
  } catch (error) {
    recordDiscoveryRuntimeFailure(runtimeFailureFrom(error));
  }
}
