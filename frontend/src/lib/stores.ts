import { derived, get, writable } from "svelte/store";
import type { Discovery, Envelope, SessionStatus } from "./api";
import { m } from "../paraglide/messages.js";

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
  activeOperation: any | null;
  lastOutcome: StatusBarOutcome | null;
  actions: StatusBarAction[];
};

export const devices = writable<any[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<any | null>(null);
export const selectionVersion = writable(0);
export const activeScreen = writable("overview");
export const operationStatus = writable<any | null>(null);
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null, actions: [] });
export const workbenchLog = writable<WorkbenchLogEntry[]>([]);
export const selectedLogEntryId = writable("");
export const sessionStatus = writable<SessionStatus>({ state: "idle" });
export const sessions = writable<SessionStatus[]>([]);
export const overviewEnvelope = writable<Envelope | null>(null);
export const overviewBioSensorEnvelope = writable<Envelope | null>(null);
export const overviewMDSEnvelope = writable<Envelope | null>(null);
export const overviewLoading = writable(false);
export const overviewMDSLoading = writable(false);
export const pendingInteraction = writable<any | null>(null);
export const appError = writable<string | null>(null);
export const toasts = writable<string[]>([]);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);
export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");
export const sessionProblem = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "stale" || $sessionStatus.state === "error");

const LOG_LIMIT = 250;
let logSequence = 0;

function nextLogEntryId() {
  logSequence += 1;
  return `log-${logSequence}`;
}

function compactCounts(value: any) {
  const counts: Record<string, number> = {};
  if (!value || typeof value !== "object") return undefined;
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) {
      counts[key] = item.length;
    }
  }
  return Object.keys(counts).length ? counts : undefined;
}

function compactResult(value: any) {
  if (!value || typeof value !== "object") return undefined;
  const result = value.result ?? value.report ?? value;
  const summary = value.summary ?? value.message ?? result?.summary ?? result?.message;
  const kind = value.kind ?? result?.kind ?? result?.operationKind;
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
    ...(envelope.selectedDevice ? { selectedDevice: envelope.selectedDevice.product || envelope.selectedDevice.deviceId } : {}),
    ...(envelope.session?.state ? { session: { state: envelope.session.state } } : {}),
    ...(envelope.error ? { error: envelope.error } : {}),
    ...(envelope.result ? { result: compactResult(envelope.result) } : {}),
  };
}

export function appendLogEntry(entry: Omit<WorkbenchLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
  const id = entry.id || nextLogEntryId();
  const timestamp = entry.timestamp || new Date().toISOString();
  const next: WorkbenchLogEntry = { ...entry, id, timestamp };
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
  devices.set(response.devices || []);
  selectedSelector.set(nextSelector);
  selectedDevice.set(response.selectedDevice || null);
  if (changed) {
    selectionVersion.update((value) => value + 1);
    overviewEnvelope.set(null);
    overviewBioSensorEnvelope.set(null);
    overviewMDSEnvelope.set(null);
    overviewMDSLoading.set(false);
  }
  if (response.session) sessionStatus.set(response.session);
  if (response.error) {
    appError.set(response.error.hint ? `${response.error.message} ${response.error.hint}` : response.error.message);
  } else {
    appError.set(null);
  }
  return changed;
}

export function applyEnvelope(response: Envelope | null) {
  if (response?.session) {
    sessionStatus.set(response.session);
  }
}

export function setStatusOperation(operation: any | null) {
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
  return logEntryId;
}

export function finishOperation() {
  setStatusOperation(null);
  pendingInteraction.set(null);
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
      message: error.hint ? `${error.message} ${error.hint}` : error.message,
      operationId: envelope.operationId,
      screen: get(activeScreen),
      selector: currentSelector(),
      detailId,
      data: compactEnvelope(envelope),
    });
    setStatusOutcome({
      tone: "error",
      title: m.operation_failed_with_label({ label }),
      message: error.hint ? `${error.message} ${error.hint}` : error.message,
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
    message: envelope.result?.summary || envelope.result?.message || m.operation_finished_successfully(),
    operationId: envelope.operationId,
    screen: get(activeScreen),
    selector: currentSelector(),
    detailId,
    data: compactEnvelope(envelope),
  });
  setStatusOutcome({
    tone: "success",
    title: m.operation_complete_with_label({ label }),
    message: envelope.result?.summary || envelope.result?.message || m.operation_finished_successfully(),
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
