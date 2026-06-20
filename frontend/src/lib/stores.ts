import { derived, get, writable } from "svelte/store";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { OperationEvent } from "../../bindings/github.com/go-ctap/kit/model";
import type { InteractionPrompt, MDSLookupEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import type { Discovery, Envelope, OperationError, SessionStatus } from "./api";
import { m } from "../paraglide/messages.js";

export type MDSLookupState = MDSLookupEnvelope | { error: OperationError };

export type ActiveOperation = {
  operationId?: string;
  sessionId?: string;
  label?: string;
  detailId?: string;
  logEntryId?: string;
  event?: Partial<OperationEvent>;
};

export type StatusBarAction = {
  id: string;
  label: string;
  tone?: "default" | "danger" | "quiet";
  run: () => void | Promise<void>;
};

export type StatusBarOutcome = {
  tone: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  detailId?: string;
  logEntryId?: string;
  retry?: () => void | Promise<void>;
};

export type WorkbenchLogEntry = {
  id: string;
  timestamp: string;
  tone: "success" | "error" | "info" | "warning";
  source: string;
  title: string;
  message?: string;
  operationId?: string;
  stage?: string;
  screen?: string;
  selector?: string;
  detailId?: string;
  data?: unknown;
};

export type StatusBarState = {
  activeOperation: ActiveOperation | null;
  lastOutcome: StatusBarOutcome | null;
  actions: StatusBarAction[];
};

export const devices = writable<DeviceReport[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<DeviceReport | null>(null);
export const selectionVersion = writable(0);
export const activeScreen = writable("overview");
export const operationStatus = writable<ActiveOperation | null>(null);
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null, actions: [] });
export const workbenchLog = writable<WorkbenchLogEntry[]>([]);
export const selectedLogEntryId = writable("");
export const sessionStatus = writable<SessionStatus>({ state: "idle", selectedSelector: "", selectedDevice: null });
export const sessions = writable<SessionStatus[]>([]);
export const overviewEnvelope = writable<Envelope | null>(null);
export const overviewBioSensorEnvelope = writable<Envelope | null>(null);
export const overviewMDSEnvelope = writable<MDSLookupState | null>(null);
export const overviewLoading = writable(false);
export const overviewMDSLoading = writable(false);
export const pendingInteraction = writable<InteractionPrompt | null>(null);
export const appError = writable<string | null>(null);
export const toasts = writable<string[]>([]);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);
export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");
export const sessionProblem = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "stale" || $sessionStatus.state === "error");

const LOG_LIMIT = 250;
let logSequence = 0;
const REDACTED = "[redacted]";
const SECRET_FIELD_NAMES = new Set([
  "pin",
  "pinCode",
  "currentPIN",
  "pinUvAuthToken",
  "pinUVAuthToken",
  "newPIN",
  "newPin",
  "oldPIN",
  "oldPin",
  "confirmationMessage",
  "resetConfirmation",
  "resetPhrase",
]);
const NORMALIZED_SECRET_FIELD_NAMES = new Set([...SECRET_FIELD_NAMES].map(normalizeFieldName));

function nextLogEntryId() {
  logSequence += 1;
  return `log-${logSequence}`;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function compactCounts(value: unknown) {
  const counts: Record<string, number> = {};
  for (const [key, item] of Object.entries(recordValue(value))) {
    if (Array.isArray(item)) {
      counts[key] = item.length;
    }
  }
  return Object.keys(counts).length ? counts : undefined;
}

function compactResult(value: unknown) {
  const source = recordValue(value);
  if (!Object.keys(source).length) return undefined;
  const result = recordValue(source.result ?? source.report ?? source);
  const summary = source.summary ?? source.message ?? result.summary ?? result.message;
  const kind = source.kind ?? result.kind ?? result.operationKind;
  const counts = compactCounts(result);
  return {
    ...(kind ? { kind } : {}),
    ...(summary ? { summary } : {}),
    ...(counts ? { counts } : {}),
  };
}

function compactEnvelope(envelope: Envelope | null | undefined) {
  if (!envelope) return undefined;
  return {
    ...(envelope.operationId ? { operationId: envelope.operationId } : {}),
    ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
    ...(envelope.kind ? { kind: envelope.kind } : {}),
    ...(envelope.error ? { error: envelope.error } : {}),
    ...(envelope.result ? { result: compactResult(envelope.result) } : {}),
  };
}

function normalizeFieldName(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isSecretFieldName(key: string) {
  return NORMALIZED_SECRET_FIELD_NAMES.has(normalizeFieldName(key));
}

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeLogData(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSecretFieldName(key) ? REDACTED : sanitizeLogData(item, depth + 1);
  }
  return output;
}

function operationResultMessage(envelope: Envelope) {
  const result = envelope.result as { summary?: string; message?: string };
  return result.summary || result.message || m.operation_finished_successfully();
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
    selectionVersion.update((value) => value + 1);
    overviewEnvelope.set(null);
    overviewBioSensorEnvelope.set(null);
    overviewMDSEnvelope.set(null);
    overviewMDSLoading.set(false);
  }
  sessionStatus.set(response.session);
  if (response.error) {
    appError.set(response.error.message);
  } else {
    appError.set(null);
  }
  return changed;
}

export function applyEnvelope(response: Envelope | null) {
  if (!response) return;
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
  overviewEnvelope.set(null);
  overviewBioSensorEnvelope.set(null);
  overviewMDSEnvelope.set(null);
  overviewMDSLoading.set(false);
  selectionVersion.update((value) => value + 1);
}

export function summarizeEnvelope(label: string, envelope: Envelope | null | undefined, detailId?: string, retry?: () => void | Promise<void>) {
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
      data: compactEnvelope(envelope),
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
    message: operationResultMessage(envelope),
    operationId: envelope.operationId,
    screen: get(activeScreen),
    selector: currentSelector(),
    detailId,
    data: compactEnvelope(envelope),
  });
  setStatusOutcome({
    tone: "success",
    title: m.operation_complete_with_label({ label }),
    message: operationResultMessage(envelope),
    detailId,
    logEntryId,
  });
}

export function pushToast(message: string) {
  toasts.update((items) => [message, ...items].slice(0, 3));
  setTimeout(() => {
    toasts.update((items) => items.filter((item) => item !== message));
  }, 4200);
}

export function currentSelector() {
  return get(selectedSelector);
}
