import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { m } from "../paraglide/messages.js";
import type { OperationEnvelope } from "./api.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { resetLabDeviceState } from "./features/lab/state.js";
import { resetLargeBlobsDeviceState } from "./features/largeblobs/state.js";
import {
  idleLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
} from "./features/overview/state.js";
import { resetPasskeysDeviceState } from "./features/passkeys/state.js";
import { resetSecurityDeviceState } from "./features/security/state.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import {
  statusBar,
  type ActiveOperation,
  type StatusBarOutcome,
} from "./features/workbench/state.js";
import { currentSessionId } from "./session-boundary.js";
import type { Discovery } from "./session-model.js";
import { failureMessage, isCanceledFailure } from "./failure.js";

export function applyDiscovery(response: Discovery): boolean {
  const nextSelector = response.selectedSelector || "";
  const previousSelector = get(selectedSelector);
  const changed = nextSelector !== previousSelector;
  devices.set(response.devices);
  selectedSelector.set(nextSelector);
  selectedDevice.set(response.selectedDevice || null);
  if (changed) {
    clearWorkbenchScreenCaches();
  }
  sessionStatus.set(response.session);
  return changed;
}

export function setStatusOperation(operation: ActiveOperation | null) {
  statusBar.update((state) => ({ ...state, activeOperation: operation }));
}

export function beginOperation(label: string) {
  setStatusOperation({
    sessionId: currentSessionId() || undefined,
    label,
  });
  sessionStatus.update((state) => state.sessionId ? { ...state, state: "running" } : state);
}

export function finishOperation() {
  setStatusOperation(null);
  pendingInteraction.set(null);
  sessionStatus.update((state) => {
    if (state.state !== "running") return state;
    return { ...state, state: "ready" };
  });
}

export function setStatusOutcome(outcome: StatusBarOutcome | null) {
  statusBar.update((state) => ({ ...state, lastOutcome: outcome }));
}

function notifyOperationFailure(outcome: StatusBarOutcome) {
  const options = {
    description: outcome.message,
    duration: outcome.tone === "error" ? 10_000 : 7_000,
    important: true,
  };

  if (outcome.tone === "error") {
    toast.error(outcome.title, options);
  } else {
    toast.info(outcome.title, options);
  }
}

export function clearWorkbenchScreenCaches() {
  overviewInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  resetLabDeviceState();
  resetPasskeysDeviceState();
  resetLargeBlobsDeviceState();
  resetSecurityDeviceState();
}

export function summarizeEnvelope(label: string, envelope: OperationEnvelope) {
  finishOperation();
  const error = envelope.error;
  if (error) {
    const canceled = isCanceledFailure(error);
    const title = canceled ? m.operation_canceled_with_label({ label }) : m.operation_failed_with_label({ label });
    const outcome: StatusBarOutcome = {
      tone: canceled ? "info" : "error",
      title,
      message: failureMessage(error),
    };
    setStatusOutcome(outcome);
    notifyOperationFailure(outcome);
    return;
  }
  setStatusOutcome({
    tone: "success",
    title: m.operation_complete_with_label({ label }),
    message: m.operation_finished_successfully(),
  });
}

export function summarizeOperationFailure(
  label: string,
  error: Failure,
) {
  summarizeOperationFailureWithMessage(label, error, failureMessage(error));
}

export function summarizeOperationContractFailure(
  label: string,
  error: Failure,
) {
  summarizeOperationFailureWithMessage(label, error, m.failure_result_type_mismatch());
}

function summarizeOperationFailureWithMessage(
  label: string,
  error: Failure,
  message: string,
) {
  finishOperation();
  const canceled = isCanceledFailure(error);
  const title = canceled ? m.operation_canceled_with_label({ label }) : m.operation_failed_with_label({ label });
  const outcome: StatusBarOutcome = {
    tone: canceled ? "info" : "error",
    title,
    message,
  };
  setStatusOutcome(outcome);
  notifyOperationFailure(outcome);
}
