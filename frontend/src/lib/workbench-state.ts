import { get } from "svelte/store";

import { ErrorCategory, type ErrorCategory as ErrorCategoryValue } from "../../bindings/github.com/go-ctap/kit/model";
import { m } from "../paraglide/messages.js";
import type { OperationEnvelope } from "./api.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { resetLargeBlobsDeviceState } from "./features/largeblobs/state.js";
import {
  idleLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
} from "./features/overview/state.js";
import { resetPasskeysDeviceState } from "./features/passkeys/state.js";
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

const RETRYABLE_ERROR_CATEGORIES = new Set<ErrorCategoryValue>([
  ErrorCategory.ErrorTransportFailure,
  ErrorCategory.ErrorTimeout,
  ErrorCategory.ErrorBusy,
]);

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

export function clearWorkbenchScreenCaches() {
  overviewInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  resetPasskeysDeviceState();
  resetLargeBlobsDeviceState();
}

export function summarizeEnvelope(label: string, envelope: OperationEnvelope | null | undefined, retry?: () => void | Promise<void>) {
  if (!envelope) return;
  finishOperation();
  const error = envelope.error;
  if (error) {
    const canceled = error.category === ErrorCategory.ErrorCanceled;
    const title = canceled ? m.operation_canceled_with_label({ label }) : m.operation_failed_with_label({ label });
    setStatusOutcome({
      tone: canceled ? "info" : "error",
      title,
      message: error.message,
      retry: !canceled && error.category && RETRYABLE_ERROR_CATEGORIES.has(error.category) ? retry : undefined,
    });
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
  error: { message: string; category?: ErrorCategoryValue },
  retry?: () => void | Promise<void>,
) {
  finishOperation();
  const canceled = error.category === ErrorCategory.ErrorCanceled;
  const title = canceled ? m.operation_canceled_with_label({ label }) : m.operation_failed_with_label({ label });
  setStatusOutcome({
    tone: canceled ? "info" : "error",
    title,
    message: error.message,
    retry: !canceled && error.category && RETRYABLE_ERROR_CATEGORIES.has(error.category) ? retry : undefined,
  });
}
