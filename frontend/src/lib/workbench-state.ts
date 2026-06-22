import { get } from "svelte/store";
import type { OperationEnvelope } from "./api.js";
import type { Discovery } from "./session-model.js";
import { operationEnvelopeLogData } from "./ctapkit-results.js";
import { sanitizeDisplayData } from "./redaction.js";
import { currentSessionId } from "./session-boundary.js";
import {
  operationStatus,
  selectedLogEntryId,
  statusBar,
  workbenchLog,
  type ActiveOperation,
  type StatusBarAction,
  type StatusBarOutcome,
  type WorkbenchLogEntry,
  activeScreen,
  appError,
} from "./features/workbench/state.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  selectionVersion,
  sessionStatus,
} from "./features/session/state.js";
import { pendingInteraction } from "./features/interaction/state.js";
import {
  idleLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
} from "./features/overview/state.js";
import { m } from "../paraglide/messages.js";

const LOG_LIMIT = 250;
let logSequence = 0;

function nextLogEntryId() {
  logSequence += 1;
  return `log-${logSequence}`;
}

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  return sanitizeDisplayData(value, depth);
}

export function appendLogEntry(entry: Omit<WorkbenchLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
  const id = entry.id || nextLogEntryId();
  const timestamp = entry.timestamp || new Date().toISOString();
  const next: WorkbenchLogEntry = { ...entry, id, timestamp, data: sanitizeLogData(entry.data) };
  workbenchLog.update((items) => [next, ...items].slice(0, LOG_LIMIT));
  if (!get(selectedLogEntryId)) {
    selectedLogEntryId.set(id);
  }
  return id;
}

export function focusLogEntry(id: string | undefined) {
  if (!id) return;
  selectedLogEntryId.set(id);
}

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
  if (response.error) {
    appError.set(response.error.message);
  } else {
    appError.set(null);
  }
  return changed;
}

export function setStatusOperation(operation: ActiveOperation | null) {
  operationStatus.set(operation);
  statusBar.update((state) => ({ ...state, activeOperation: operation }));
}

export function beginOperation(label: string, detailId?: string) {
  const logEntryId = appendLogEntry({
    tone: "info",
    source: "operation",
    title: m.operation_started({ label }),
    message: m.waiting_for_authenticator_response(),
    screen: get(activeScreen),
    selector: currentSelector(),
    detailId,
    data: {
      label,
      detailId,
      status: "started",
    },
  });
  setStatusOperation({
    sessionId: currentSessionId() || undefined,
    label,
    detailId,
    logEntryId,
    event: {
      message: m.operation_running_with_label({ label }),
    },
  });
  sessionStatus.update((state) => state.selectedSelector ? { ...state, state: "running" } : state);
  return logEntryId;
}

export function finishOperation() {
  setStatusOperation(null);
  pendingInteraction.set(null);
  sessionStatus.update((state) => state.state === "running" ? { ...state, state: "ready" } : state);
}

export function setStatusOutcome(outcome: StatusBarOutcome | null) {
  let next = outcome;
  if (outcome && !outcome.logEntryId) {
    const logEntryId = appendLogEntry({
      tone: outcome.tone,
      source: "status",
      title: outcome.title,
      message: outcome.message,
      detailId: outcome.detailId,
      screen: get(activeScreen),
      selector: currentSelector(),
      data: {
        title: outcome.title,
        message: outcome.message,
        detailId: outcome.detailId,
      },
    });
    next = { ...outcome, logEntryId };
  }
  statusBar.update((state) => ({ ...state, lastOutcome: next }));
}

export function setStatusActions(actions: StatusBarAction[]) {
  statusBar.update((state) => ({ ...state, actions }));
}

export function clearWorkbenchScreenCaches() {
  overviewInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  selectionVersion.update((value) => value + 1);
}

export function summarizeEnvelope(label: string, envelope: OperationEnvelope | null | undefined, detailId?: string, retry?: () => void | Promise<void>) {
  if (!envelope) return;
  finishOperation();
  const error = envelope.error;
  if (error) {
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "operation",
      title: m.operation_failed_with_label({ label }),
      message: error.message,
      operationId: envelope.operationId,
      screen: get(activeScreen),
      selector: currentSelector(),
      detailId,
      data: operationEnvelopeLogData(envelope),
    });
    setStatusOutcome({
      tone: "error",
      title: m.operation_failed_with_label({ label }),
      message: error.message,
      detailId,
      logEntryId,
      retry,
    });
    return;
  }
  const logEntryId = appendLogEntry({
    tone: "success",
    source: "operation",
    title: m.operation_complete_with_label({ label }),
    message: m.operation_finished_successfully(),
    operationId: envelope.operationId,
    screen: get(activeScreen),
    selector: currentSelector(),
    detailId,
    data: operationEnvelopeLogData(envelope),
  });
  setStatusOutcome({
    tone: "success",
    title: m.operation_complete_with_label({ label }),
    message: m.operation_finished_successfully(),
    detailId,
    logEntryId,
  });
}

export function currentSelector() {
  return get(selectedSelector);
}
