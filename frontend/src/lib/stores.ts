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

export type CredentialsScreenState = {
  envelope: any | null;
  preview: any | null;
  editing: any | null;
  displayName: string;
  name: string;
  userIDHex: string;
};

export type LargeBlobScreenState = {
  envelope: any | null;
  readResult: any | null;
  readCredentialId: string;
  selectedId: string;
  payload: string;
  payloadByCredential: Record<string, string>;
  decodeMode: string;
  readDecodeMode: string;
  preview: any | null;
  previewBinding: any | null;
  previewMode: "write" | "delete" | "";
  detailMode: "read" | "write" | "delete" | "raw";
};

export type SharedCredentialInventory = {
  selector: string;
  selectionVersion: number;
  deviceId?: string;
  loadedAt: string;
  source: "credentials" | "largeBlobs";
  hasManagementFields: boolean;
  hasBlobFields: boolean;
  managementEnvelope?: any | null;
  blobEnvelope?: any | null;
  managementGroups: any[];
  managementCredentials: any[];
  blobCredentials: any[];
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
export const overviewEnvelope = writable<Envelope | null>(null);
export const overviewBioSensorEnvelope = writable<Envelope | null>(null);
export const overviewLoading = writable(false);
export const pendingInteraction = writable<any | null>(null);
export const appError = writable<string | null>(null);
export const toasts = writable<string[]>([]);
export const credentialsScreenCache = writable<Record<string, CredentialsScreenState>>({});
export const largeBlobScreenCache = writable<Record<string, LargeBlobScreenState>>({});
export const sharedCredentialInventoryCache = writable<Record<string, SharedCredentialInventory>>({});

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

function envelopeReport(envelope: any) {
  return envelope?.result?.report ?? envelope?.result?.result ?? envelope?.result ?? null;
}

function listValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function credentialKey(credential: any) {
  return credential?.credentialIDHex || credential?.credentialIdHex || credential?.id || "";
}

function normalizeManagementCredentials(report: any) {
  const rows: any[] = [];
  for (const group of listValue(report?.groups)) {
    for (const credential of listValue(group?.credentials)) {
      rows.push({
        ...credential,
        credentialIDHex: credential.credentialIDHex || credential.credentialIdHex || credential.id || "",
        userIDHex: credential.userIDHex || credential.userIdHex || credential.user?.idHex || "",
        userName: credential.userName || credential.user?.name || "",
        displayName: credential.displayName || credential.user?.displayName || "",
        rpID: group.rpID || group.rpId || group.rp?.id || "",
        rpName: group.rpName || group.rp?.name || "",
        rp: {
          id: group.rpID || group.rpId || group.rp?.id || "",
          name: group.rpName || group.rp?.name || "",
        },
        user: {
          idHex: credential.userIDHex || credential.userIdHex || credential.user?.idHex || "",
          name: credential.userName || credential.user?.name || "",
          displayName: credential.displayName || credential.user?.displayName || "",
        },
        blobState: credential.blobState || credential.largeBlobKeyState || "unknown",
        blobByteCount: credential.blobByteCount ?? credential.rawByteCount ?? 0,
      });
    }
  }
  return rows;
}

function normalizeBlobCredentials(report: any) {
  return listValue(report?.credentials).map((credential: any) => ({
    ...credential,
    credentialIDHex: credential.credentialIDHex || credential.credentialIdHex || credential.id || "",
    userIDHex: credential.userIDHex || credential.userIdHex || credential.user?.idHex || "",
    userName: credential.userName || credential.user?.name || "",
    displayName: credential.displayName || credential.user?.displayName || "",
    rpID: credential.rpID || credential.rpId || credential.rp?.id || "",
    rpName: credential.rpName || credential.rp?.name || "",
    rp: {
      id: credential.rpID || credential.rpId || credential.rp?.id || "",
      name: credential.rpName || credential.rp?.name || "",
    },
    user: {
      idHex: credential.userIDHex || credential.userIdHex || credential.user?.idHex || "",
      name: credential.userName || credential.user?.name || "",
      displayName: credential.displayName || credential.user?.displayName || "",
    },
    blobState: credential.blobState || "unknown",
    blobByteCount: credential.blobByteCount ?? credential.rawByteCount ?? 0,
  }));
}

export function credentialGroupsFromRows(credentials: any[]) {
  const groups = new Map<string, any>();
  for (const credential of credentials) {
    const rpID = credential.rpID || credential.rp?.id || "unknown RP";
    const rpName = credential.rpName || credential.rp?.name || rpID;
    if (!groups.has(rpID)) {
      groups.set(rpID, { rpID, rpName, credentials: [] });
    }
    groups.get(rpID).credentials.push(credential);
  }
  return Array.from(groups.values());
}

export function updateSharedCredentialInventory(selector: string, envelope: any, source: "credentials" | "largeBlobs") {
  if (!selector || envelope?.error) return;
  const report = envelopeReport(envelope);
  const version = get(selectionVersion);
  const selected = get(selectedDevice);
  sharedCredentialInventoryCache.update((cache) => {
    const previous = cache[selector];
    const managementCredentials = source === "credentials" ? normalizeManagementCredentials(report) : previous?.managementCredentials || [];
    const managementGroups = source === "credentials"
      ? listValue(report?.groups)
      : previous?.managementGroups || credentialGroupsFromRows(managementCredentials);
    const blobCredentials = source === "largeBlobs" ? normalizeBlobCredentials(report) : previous?.blobCredentials || [];
    const next: SharedCredentialInventory = {
      selector,
      selectionVersion: version,
      deviceId: selected?.deviceId,
      loadedAt: new Date().toISOString(),
      source,
      hasManagementFields: source === "credentials" || Boolean(previous?.hasManagementFields),
      hasBlobFields: source === "largeBlobs" || Boolean(previous?.hasBlobFields),
      managementEnvelope: source === "credentials" ? envelope : previous?.managementEnvelope || null,
      blobEnvelope: source === "largeBlobs" ? envelope : previous?.blobEnvelope || null,
      managementGroups,
      managementCredentials,
      blobCredentials,
    };
    return { ...cache, [selector]: next };
  });
}

export function sharedInventoryFor(selector: string) {
  if (!selector) return null;
  const inventory = get(sharedCredentialInventoryCache)[selector] || null;
  if (!inventory || inventory.selectionVersion !== get(selectionVersion)) return null;
  return inventory;
}

export function clearSharedCredentialInventory(selector?: string) {
  if (!selector) {
    sharedCredentialInventoryCache.set({});
    return;
  }
  sharedCredentialInventoryCache.update((cache) => {
    const next = { ...cache };
    delete next[selector];
    return next;
  });
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
  activeScreen.set("logs");
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
    clearSharedCredentialInventory(previousSelector);
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
    title: `${label} started`,
    message: "Waiting for authenticator response.",
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
      message: `${label} running`,
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

export function emptyCredentialsState(): CredentialsScreenState {
  return { envelope: null, preview: null, editing: null, displayName: "", name: "", userIDHex: "" };
}

export function emptyLargeBlobState(): LargeBlobScreenState {
  return {
    envelope: null,
    readResult: null,
    readCredentialId: "",
    selectedId: "",
    payload: "",
    payloadByCredential: {},
    decodeMode: "utf8",
    readDecodeMode: "",
    preview: null,
    previewBinding: null,
    previewMode: "",
    detailMode: "read",
  };
}

export function setCredentialsScreenState(selector: string, state: CredentialsScreenState) {
  if (!selector) return;
  credentialsScreenCache.update((cache) => ({ ...cache, [selector]: state }));
}

export function setLargeBlobScreenState(selector: string, state: LargeBlobScreenState) {
  if (!selector) return;
  largeBlobScreenCache.update((cache) => ({ ...cache, [selector]: state }));
}

export function clearWorkbenchScreenCaches() {
  overviewEnvelope.set(null);
  overviewBioSensorEnvelope.set(null);
  credentialsScreenCache.set({});
  largeBlobScreenCache.set({});
  clearSharedCredentialInventory();
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
      title: `${label} failed`,
      message: error.hint ? `${error.message} ${error.hint}` : error.message,
      operationId: envelope.operationId,
      screen: get(activeScreen),
      selector: currentSelector(),
      detailId,
      data: compactEnvelope(envelope),
    });
    setStatusOutcome({
      tone: "error",
      title: `${label} failed`,
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
    title: `${label} complete`,
    message: envelope.result?.summary || envelope.result?.message || "Operation finished successfully.",
    operationId: envelope.operationId,
    screen: get(activeScreen),
    selector: currentSelector(),
    detailId,
    data: compactEnvelope(envelope),
  });
  setStatusOutcome({
    tone: "success",
    title: `${label} complete`,
    message: envelope.result?.summary || envelope.result?.message || "Operation finished successfully.",
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
