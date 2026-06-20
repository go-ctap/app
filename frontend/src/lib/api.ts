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
  sessionId?: string;
  selectedSelector?: string;
  selectedDevice?: unknown;
  deviceId?: string;
  deviceLabel?: string;
  state: "idle" | "opening" | "ready" | "running" | "stale" | "closed" | "error" | string;
  activeOperation?: string;
  openedAt?: string;
  updatedAt?: string;
  error?: OperationError | null;
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
} = {
  devices: [],
  selectedSelector: "",
  selectedDevice: null,
  currentSession: null,
};

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

function labelForDevice(device: unknown) {
  const source = device as { manufacturer?: string; product?: string; serial?: string; deviceId?: string } | null;
  if (!source) return "";
  const name = [source.manufacturer, source.product].filter(Boolean).join(" ") || source.product || source.deviceId || "";
  return [name, source.serial].filter(Boolean).join(" · ");
}

function reportForSelector(selector: string) {
  return state.devices.find((device) => deviceID(device) === selector || ordinalAlias(device) === selector) || null;
}

function setCurrentSession(snapshot: kitservice.SessionSnapshot | null) {
  state.currentSession = snapshot;
  if (!snapshot) return;

  state.selectedDevice = snapshot.info?.device || state.selectedDevice;
  state.selectedSelector = deviceID(state.selectedDevice) || state.selectedSelector;
}

function snapshotTimestamp(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function sessionStatus(snapshot = state.currentSession, status?: SessionStatus["state"], error?: OperationError | null): SessionStatus {
  const device = snapshot?.info?.device || state.selectedDevice || null;
  const selector = snapshot ? deviceID(device) || ordinalAlias(device) : state.selectedSelector;
  const openedAt = snapshotTimestamp((snapshot as { openedAt?: unknown } | null)?.openedAt);
  const updatedAt = snapshotTimestamp((snapshot as { updatedAt?: unknown } | null)?.updatedAt);
  return {
    ...(snapshot?.id ? { sessionId: String(snapshot.id) } : {}),
    selectedSelector: selector,
    selectedDevice: device,
    ...(deviceID(device) ? { deviceId: deviceID(device) } : {}),
    ...(labelForDevice(device) ? { deviceLabel: labelForDevice(device) } : {}),
    state: status || (snapshot?.info?.closed ? "closed" : snapshot ? (snapshot.running ? "running" : "ready") : "idle"),
    ...(snapshot?.running ? { activeOperation: "" } : {}),
    ...(openedAt ? { openedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(error ? { error } : {}),
  };
}

function discovery(error?: OperationError | null, status?: SessionStatus["state"]): Discovery {
  return {
    devices: state.devices,
    selectedSelector: state.selectedSelector,
    selectedDevice: state.selectedDevice,
    session: sessionStatus(state.currentSession, status, error),
    ...(error ? { error } : {}),
  };
}

function sessionIsOpen(snapshot: kitservice.SessionSnapshot | null | undefined) {
  return Boolean(snapshot && !snapshot.info?.closed);
}

async function closeOpenSessions() {
  const snapshots = await service.Sessions();
  if (snapshots.some((snapshot: any) => sessionIsOpen(snapshot))) {
    await service.CloseAllSessions();
  }
  state.currentSession = null;
  return snapshots;
}

async function refreshSessions() {
  const snapshots = await service.Sessions();
  const session = state.selectedSelector
    ? snapshots.find((snapshot: any) => sessionMatches(snapshot, state.selectedSelector)) || null
    : null;

  setCurrentSession(session);

  return snapshots;
}

function sessionMatches(snapshot: kitservice.SessionSnapshot, selector: string) {
  return (
    sessionIsOpen(snapshot) &&
    (snapshot.info?.device?.deviceId === selector || snapshot.info?.device?.ordinalAlias === selector)
  );
}

async function ensureSession(selector = state.selectedSelector) {
  selector = selector.trim();
  if (!selector) throw new Error("authenticator selection is required");

  const snapshots = await service.Sessions();
  const openSessions = snapshots.filter((snapshot: any) => sessionIsOpen(snapshot));
  const existing = openSessions.find((snapshot: any) => sessionMatches(snapshot, selector));
  const onlySelectedSession = existing && openSessions.every((snapshot: any) => sessionMatches(snapshot, selector));

  if (onlySelectedSession) {
    setCurrentSession(existing);
    return existing;
  }

  if (openSessions.length) {
    await service.CloseAllSessions();
    state.currentSession = null;
  }

  const snapshot = await service.OpenSession({ selector });
  setCurrentSession(snapshot);
  state.selectedSelector = deviceID(state.selectedDevice) || selector;

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
    let envelope: kitservice.OperationEnvelope;
    try {
      envelope = await invoke({ ...payload, sessionId: session.id } as T);
    } finally {
      try {
        setCurrentSession(await service.Session(session.id));
      } catch {
        // The operation result should keep its original success/error semantics.
      }
    }

    return decorateEnvelope(envelope);
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

      if (state.selectedSelector) {
        await ensureSession(state.selectedSelector);
      } else {
        await closeOpenSessions();
      }
      return discovery();
    } catch (error) {
      return discovery(errorFrom(error), state.selectedSelector ? "error" : "idle");
    }
  },

  async select(selector: string): Promise<Discovery> {
    const requestedSelector = selector.trim();
    state.selectedDevice = requestedSelector ? reportForSelector(requestedSelector) : null;
    state.selectedSelector = state.selectedDevice ? deviceID(state.selectedDevice) || ordinalAlias(state.selectedDevice) : "";

    try {
      if (state.selectedSelector) {
        await ensureSession(state.selectedSelector);
      } else {
        await closeOpenSessions();
      }
      return discovery();
    } catch (error) {
      return discovery(errorFrom(error), state.selectedSelector ? "error" : "idle");
    }
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

    return sessionStatus(state.currentSession, "closed");
  },

  async closeAllSessions(): Promise<SessionStatus[]> {
    const closed = await service.CloseAllSessions();
    state.currentSession = null;
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
  bioSensorInfo: operation(service.BioSensorInfo),

  async lookupMDS(request: kitservice.MDSLookupRequest | string, refresh = false): Promise<MDSLookupEnvelope> {
    return decorateMDS(await service.LookupMDS(typeof request === "string" ? { aaguid: request, refresh } : request));
  },
} as const;

export function operationFailed(envelope: ErrorLike): string | null {
  if (!envelope?.error) return null;
  return envelope.error.hint ? `${envelope.error.message} ${envelope.error.hint}` : envelope.error.message;
}
