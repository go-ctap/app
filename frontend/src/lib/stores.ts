import { derived, get, writable } from "svelte/store";
import type { Discovery, Envelope, SessionStatus } from "./api";

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
  retry?: () => void | Promise<void>;
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
export const sessionStatus = writable<SessionStatus>({ state: "idle" });
export const overviewEnvelope = writable<Envelope | null>(null);
export const overviewLoading = writable(false);
export const pendingInteraction = writable<any | null>(null);
export const appError = writable<string | null>(null);
export const toasts = writable<string[]>([]);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);
export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");
export const sessionProblem = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "stale" || $sessionStatus.state === "error");

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

export function setStatusOutcome(outcome: StatusBarOutcome | null) {
  statusBar.update((state) => ({ ...state, lastOutcome: outcome }));
}

export function setStatusActions(actions: StatusBarAction[]) {
  statusBar.update((state) => ({ ...state, actions }));
}

export function summarizeEnvelope(label: string, envelope: Envelope | null | undefined, detailId?: string, retry?: () => void | Promise<void>) {
  if (!envelope) return;
  const error = envelope.error;
  if (error) {
    setStatusOutcome({
      tone: "error",
      title: `${label} failed`,
      message: error.hint ? `${error.message} ${error.hint}` : error.message,
      detailId,
      retry,
    });
    return;
  }
  setStatusOutcome({
    tone: "success",
    title: `${label} complete`,
    message: envelope.result?.summary || envelope.result?.message || "Operation finished successfully.",
    detailId,
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
