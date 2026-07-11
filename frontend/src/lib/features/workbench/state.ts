import { writable } from "svelte/store";

import type { OperationEvent } from "../../../../bindings/github.com/go-ctap/kit/model";
import type { RuntimeErrorEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

export type ActiveOperation = {
  operationId?: string;
  sessionId?: string;
  label?: string;
  detailId?: string;
  logEntryId?: string;
  event?: Partial<OperationEvent>;
  cancelPending?: boolean;
  cancelRequested?: boolean;
  cancelError?: RuntimeErrorEnvelope | null;
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
};

export type ActiveScreen = "overview" | "passkeys" | "settings";

export const activeScreen = writable<ActiveScreen>("overview");
export const operationStatus = writable<ActiveOperation | null>(null);
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null });
export const workbenchLog = writable<WorkbenchLogEntry[]>([]);
export const selectedLogEntryId = writable("");
export const appError = writable<string | null>(null);

export function resetWorkbenchStateForTest() {
  activeScreen.set("overview");
  operationStatus.set(null);
  statusBar.set({ activeOperation: null, lastOutcome: null });
  workbenchLog.set([]);
  selectedLogEntryId.set("");
  appError.set(null);
}
