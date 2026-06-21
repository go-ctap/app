import { derived, writable } from "svelte/store";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { OperationEvent } from "../../bindings/github.com/go-ctap/kit/model";
import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import type { OperationEnvelope, OperationError, SessionStatus } from "./api";

export type MDSLookupViewState = {
  result?: LookupResult;
  error?: OperationError | null;
};

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

export type ActiveScreen = "overview" | "settings";

export const devices = writable<DeviceReport[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<DeviceReport | null>(null);
export const selectionVersion = writable(0);
export const activeScreen = writable<ActiveScreen>("overview");
export const operationStatus = writable<ActiveOperation | null>(null);
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null, actions: [] });
export const workbenchLog = writable<WorkbenchLogEntry[]>([]);
export const selectedLogEntryId = writable("");
export const sessionStatus = writable<SessionStatus>({ state: "idle", selectedSelector: "", selectedDevice: null });
export const sessions = writable<SessionStatus[]>([]);
export const overviewEnvelope = writable<OperationEnvelope | null>(null);
export const overviewBioSensorEnvelope = writable<OperationEnvelope | null>(null);
export const overviewMDSLookup = writable<MDSLookupViewState | null>(null);
export const overviewLoading = writable(false);
export const overviewMDSLoading = writable(false);
export const pendingInteraction = writable<InteractionPrompt | null>(null);
export const appError = writable<string | null>(null);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);
export const sessionBusy = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "opening" || $sessionStatus.state === "running");
export const sessionProblem = derived(sessionStatus, ($sessionStatus) => $sessionStatus.state === "stale" || $sessionStatus.state === "error");
