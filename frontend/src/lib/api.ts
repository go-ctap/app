import * as service from "../../bindings/fidobench/ctapkitservice";
import type * as kitservice from "../../bindings/github.com/go-ctap/kit/service/models";
import type { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

type SessionBound = { sessionId: kitservice.SessionID; verificationFlow?: unknown };
type WithSelector<T> = Omit<T, "sessionId"> & { selector?: string };
type Selectable<T extends SessionBound> = string | WithSelector<T>;
type OperationCall<T extends SessionBound> = (request: T) => Promise<kitservice.OperationEnvelope>;
type ErrorLike = { error?: OperationError | null } | null | undefined;
type DiscoverInput = { transport?: string; mode?: Mode };
type OpenSessionInput = string | { selector?: string };
type CancelInput = string | { operationId?: string };
type InteractionAnswer = { interactionId: string; pin?: string; confirmed?: boolean; canceled?: boolean };
type LargeBlobMutationInput = kitservice.LargeBlobMutationRequest & { payload?: number[] | string };
type MDSLookupEnvelope = kitservice.MDSLookupEnvelope & {
  selectedDevice?: unknown;
  session?: SessionStatus;
};

export type OperationError = {
  category?: string;
  message: string;
  hint?: string;
};

export type SessionStatus = {
  selectedSelector?: string;
  selectedDevice?: unknown;
  state: "idle" | "opening" | "ready" | "running" | "stale" | "closed" | "error" | string;
  activeOperation?: string;
  error?: OperationError | null;
  openedAt?: string;
  updatedAt?: string;
};

export type Discovery = {
  devices: unknown[];
  selectedSelector?: string;
  selectedDevice?: unknown;
  session: SessionStatus;
  error?: OperationError | null;
};

export type Envelope = kitservice.OperationEnvelope & {
  selectedDevice?: unknown;
  session?: SessionStatus;
};

const state: {
  devices: unknown[];
  selectedSelector: string;
  selectedDevice: unknown;
  currentSession: kitservice.SessionSnapshot | null;
  openedAt: string;
  updatedAt: string;
} = {
  devices: [],
  selectedSelector: "",
  selectedDevice: null,
  currentSession: null,
  openedAt: "",
  updatedAt: "",
};

const now = () => new Date().toISOString();

function errorFrom(error: unknown): OperationError {
  const source = error as { category?: string; message?: string; error?: { message?: string } };
  return {
    ...(source?.category ? { category: source.category } : {}),
    message: source?.message || source?.error?.message || (error instanceof Error ? error.message : String(error || "operation failed")),
  };
}

function selectorFrom(request?: OpenSessionInput | null) {
  return (typeof request === "string" ? request : request?.selector || state.selectedSelector).trim();
}

function deviceID(device: unknown) {
  return String((device as { deviceId?: string })?.deviceId || "");
}

function ordinalAlias(device: unknown) {
  return String((device as { ordinalAlias?: string })?.ordinalAlias || "");
}

function reportForSelector(selector: string) {
  return state.devices.find((device) => deviceID(device) === selector || ordinalAlias(device) === selector) || null;
}

function setCurrentSession(snapshot: kitservice.SessionSnapshot | null) {
  state.currentSession = snapshot;
  if (!snapshot) {
    state.openedAt = "";
    return;
  }

  state.selectedDevice = snapshot.info?.device || state.selectedDevice;
  state.selectedSelector = deviceID(state.selectedDevice) || state.selectedSelector;
  state.openedAt ||= now();
  state.updatedAt = now();
}

function sessionStatus(snapshot = state.currentSession, status?: SessionStatus["state"], error?: OperationError | null): SessionStatus {
  const device = snapshot?.info?.device || state.selectedDevice || null;
  return {
    selectedSelector: state.selectedSelector,
    selectedDevice: device,
    state: status || (snapshot?.info?.closed ? "closed" : snapshot ? (snapshot.running ? "running" : "ready") : "idle"),
    ...(snapshot?.running ? { activeOperation: "" } : {}),
    ...(error ? { error } : {}),
    ...(state.openedAt ? { openedAt: state.openedAt } : {}),
    ...(state.updatedAt ? { updatedAt: state.updatedAt } : {}),
  };
}

function discovery(error?: OperationError | null): Discovery {
  return {
    devices: state.devices,
    selectedSelector: state.selectedSelector,
    selectedDevice: state.selectedDevice,
    session: sessionStatus(state.currentSession, undefined, error),
    ...(error ? { error } : {}),
  };
}

async function refreshSessions() {
  const snapshots = await service.Sessions();
  const session =
    state.selectedSelector
      ? snapshots.find((snapshot: any) => sessionMatches(snapshot, state.selectedSelector)) || null
      : snapshots.find((snapshot: any) => !snapshot.info?.closed) || null;

  setCurrentSession(session);

  return snapshots;
}

function sessionMatches(snapshot: kitservice.SessionSnapshot, selector: string) {
  return (
    !snapshot.info?.closed &&
    (snapshot.info?.device?.deviceId === selector || snapshot.info?.device?.ordinalAlias === selector)
  );
}

async function ensureSession(selector = state.selectedSelector) {
  selector = selector.trim();
  if (!selector) throw new Error("authenticator selection is required");

  if (state.currentSession && sessionMatches(state.currentSession, selector)) return state.currentSession;

  const existing = (await service.Sessions()).find((snapshot: any) => sessionMatches(snapshot, selector));
  if (existing) {
    setCurrentSession(existing);
    return existing;
  }

  const snapshot = await service.OpenSession({ selector });
  setCurrentSession(snapshot);
  state.selectedSelector = deviceID(state.selectedDevice) || selector;
  state.openedAt = now();
  state.updatedAt = state.openedAt;

  return snapshot;
}

function splitRequest<T extends SessionBound>(request: Selectable<T>) {
  if (typeof request === "string") {
    return { selector: request.trim(), payload: {} as Omit<T, "sessionId"> };
  }

  const { selector, ...payload } = request;
  return { selector: selectorFrom({ selector }), payload };
}

function decorateEnvelope(envelope: kitservice.OperationEnvelope): Envelope {
  state.updatedAt = now();
  return {
    ...envelope,
    selectedDevice: state.selectedDevice,
    session: sessionStatus(),
  };
}

function decorateMDS(envelope: kitservice.MDSLookupEnvelope): MDSLookupEnvelope {
  return {
    ...envelope,
    selectedDevice: state.selectedDevice,
    session: sessionStatus(),
  };
}

function operation<T extends SessionBound>(invoke: OperationCall<T>) {
  return async (request: Selectable<T>): Promise<Envelope> => {
    const { selector, payload } = splitRequest(request);
    const session = await ensureSession(selector);
    return decorateEnvelope(await invoke({ ...payload, sessionId: session.id } as T));
  };
}

export const api = {
  async discover(request: DiscoverInput | string = {}): Promise<Discovery> {
    try {
      const mode = typeof request === "string" ? request : request.mode || request.transport;
      const snapshot = await service.Discover({ mode: mode || undefined });

      state.devices = snapshot.devices || [];
      state.selectedDevice = state.selectedSelector ? reportForSelector(state.selectedSelector) : null;
      if (!state.selectedDevice) state.selectedSelector = "";
      if (!state.selectedSelector && state.devices.length === 1) {
        state.selectedDevice = state.devices[0];
        state.selectedSelector = deviceID(state.selectedDevice) || ordinalAlias(state.selectedDevice);
      }

      await refreshSessions();
      return discovery();
    } catch (error) {
      return discovery(errorFrom(error));
    }
  },

  async select(selector: string): Promise<Discovery> {
    state.selectedSelector = selector.trim();
    state.selectedDevice = reportForSelector(state.selectedSelector);
    state.selectedSelector = deviceID(state.selectedDevice) || state.selectedSelector;

    await refreshSessions();
    state.updatedAt = now();
    return discovery();
  },

  async openSession(request: OpenSessionInput): Promise<SessionStatus> {
    return sessionStatus(await ensureSession(selectorFrom(request)));
  },

  async sessions(): Promise<SessionStatus[]> {
    return (await refreshSessions()).map((snapshot: any) => sessionStatus(snapshot));
  },

  async session(): Promise<SessionStatus> {
    await refreshSessions();
    return sessionStatus();
  },

  sessionStatus(): Promise<SessionStatus> {
    return api.session();
  },

  async closeSession(): Promise<SessionStatus> {
    if (state.currentSession && !state.currentSession.info?.closed) {
      setCurrentSession(await service.CloseSession(state.currentSession.id));
    }

    state.updatedAt = now();
    return sessionStatus(state.currentSession, "closed");
  },

  async closeAllSessions(): Promise<SessionStatus[]> {
    const closed = await service.CloseAllSessions();
    state.currentSession = null;
    state.openedAt = "";
    state.updatedAt = now();
    return closed.map((snapshot) => sessionStatus(snapshot, "closed"));
  },

  cancelOperation(request: CancelInput): Promise<boolean> {
    const operationId = typeof request === "string" ? request : request.operationId || "";
    return operationId ? service.CancelOperation({ operationId }) : Promise.resolve(false);
  },

  resolveInteraction(answer: InteractionAnswer): Promise<boolean> {
    return service.ResolveInteraction(answer);
  },

  inspect: operation(service.Inspect),
  listCredentials: operation(service.ListCredentials),
  deleteCredential: operation(service.DeleteCredential),
  updateCredentialUser: operation(service.UpdateCredentialUser),
  readLargeBlob: operation(service.ReadLargeBlob),
  listLargeBlobs: operation(service.ListLargeBlobs),
  writeLargeBlob: operation(service.WriteLargeBlob as OperationCall<LargeBlobMutationInput>),
  deleteLargeBlob: operation(service.DeleteLargeBlob),
  garbageCollectLargeBlobs: operation(service.GarbageCollectLargeBlobs),
  configStatus: operation(service.ConfigStatus),
  setPIN: operation(service.SetPIN),
  changePIN: operation(service.ChangePIN),
  setAlwaysUV: operation(service.SetAlwaysUV),
  setMinPINLength: operation(service.SetMinPINLength),
  bioSensorInfo: operation(service.BioSensorInfo),
  bioList: operation(service.BioList),
  bioEnroll: operation(service.BioEnroll),
  bioRename: operation(service.BioRename),
  bioRemove: operation(service.BioRemove),
  resetFactory: operation(service.ResetFactory),
  makeCredential: operation(service.MakeCredential),
  getAssertion: operation(service.GetAssertion),

  async lookupMDS(request: kitservice.MDSLookupRequest | string, refresh = false): Promise<MDSLookupEnvelope> {
    return decorateMDS(await service.LookupMDS(typeof request === "string" ? { aaguid: request, refresh } : request));
  },
} as const;

export function bytesFromText(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

export function bytesFromJSON(value: unknown): number[] {
  return bytesFromText(JSON.stringify(value));
}

export function parseHexLines(value: string): Array<{ type: "public-key"; credentialIDHex: string }> {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((credentialIDHex) => ({ type: "public-key", credentialIDHex }));
}

export function operationFailed(envelope: ErrorLike): string | null {
  if (!envelope?.error) return null;
  return envelope.error.hint ? `${envelope.error.message} ${envelope.error.hint}` : envelope.error.message;
}
