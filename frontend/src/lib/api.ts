import * as service from "../../bindings/fidobench/ctapkitservice";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import {
  RuntimeErrorEnvelope,
  type CancelOperationRequest,
  type DiscoverRequest,
  type InteractionAnswer,
  type MDSLookupEnvelope,
  type MDSLookupRequest,
  type OpenSessionRequest,
  type OperationEnvelope,
  type OperationRequest,
  type SessionID,
  type SessionSnapshot,
} from "../../bindings/github.com/go-ctap/kit/service";

export type OperationError = RuntimeErrorEnvelope;
export type Envelope = OperationEnvelope;

export type SessionStatus = {
  sessionId?: SessionID;
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  deviceId?: string;
  deviceLabel?: string;
  state: "idle" | "opening" | "ready" | "running" | "stale" | "closed" | "error" | string;
  activeOperation?: string;
  openedAt?: string;
  updatedAt?: string;
  error?: RuntimeErrorEnvelope | null;
};

export type Discovery = {
  devices: DeviceReport[];
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  session: SessionStatus;
  error?: RuntimeErrorEnvelope | null;
};

const state: {
  devices: DeviceReport[];
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  currentSession: SessionSnapshot | null;
} = {
  devices: [],
  selectedSelector: "",
  selectedDevice: null,
  currentSession: null,
};

function runtimeErrorFrom(error: unknown): RuntimeErrorEnvelope {
  const source = error as { category?: RuntimeErrorEnvelope["category"]; message?: string; error?: { message?: string } };
  const nestedMessage = source.error ? source.error.message : "";
  return new RuntimeErrorEnvelope({
    category: source.category,
    message: source.message || nestedMessage || (error instanceof Error ? error.message : String(error || "operation failed")),
  });
}

function selectorFromDevice(device: DeviceReport) {
  return device.deviceId || device.ordinalAlias || "";
}

function labelForDevice(device: DeviceReport) {
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId;
  return [name, device.serial].filter(Boolean).join(" · ");
}

function reportForSelector(selector: string) {
  return state.devices.find((device) => device.deviceId === selector || device.ordinalAlias === selector) || null;
}

function setCurrentSession(snapshot: SessionSnapshot | null) {
  state.currentSession = snapshot;
  if (!snapshot) return;

  state.selectedDevice = snapshot.info.device;
  state.selectedSelector = selectorFromDevice(snapshot.info.device);
}

function statusFromSession(
  snapshot = state.currentSession,
  stateOverride?: SessionStatus["state"],
  error?: RuntimeErrorEnvelope | null,
): SessionStatus {
  if (!snapshot) {
    const device = state.selectedDevice;
    const status: SessionStatus = {
      selectedSelector: state.selectedSelector,
      selectedDevice: device,
      state: stateOverride || "idle",
    };
    if (device) {
      status.deviceId = device.deviceId;
      status.deviceLabel = labelForDevice(device);
    }
    if (error) status.error = error;
    return status;
  }

  const device = snapshot.info.device;
  const status: SessionStatus = {
    sessionId: snapshot.id,
    selectedSelector: selectorFromDevice(device),
    selectedDevice: device,
    deviceId: device.deviceId,
    deviceLabel: labelForDevice(device),
    state: stateOverride || (snapshot.info.closed ? "closed" : snapshot.running ? "running" : "ready"),
    openedAt: String(snapshot.openedAt),
    updatedAt: String(snapshot.updatedAt),
  };
  if (snapshot.running) status.activeOperation = "";
  if (error) status.error = error;
  return status;
}

function discovery(error?: RuntimeErrorEnvelope | null, stateOverride?: SessionStatus["state"]): Discovery {
  const snapshot: Discovery = {
    devices: state.devices,
    selectedSelector: state.selectedSelector,
    selectedDevice: state.selectedDevice,
    session: statusFromSession(state.currentSession, stateOverride, error),
  };
  if (error) snapshot.error = error;
  return snapshot;
}

function sessionIsOpen(snapshot: SessionSnapshot) {
  return !snapshot.info.closed;
}

function sessionMatches(snapshot: SessionSnapshot, selector: string) {
  return sessionIsOpen(snapshot) && (snapshot.info.device.deviceId === selector || snapshot.info.device.ordinalAlias === selector);
}

async function closeOpenSessions() {
  const snapshots = await service.Sessions();
  if (snapshots.some(sessionIsOpen)) {
    await service.CloseAllSessions();
  }
  state.currentSession = null;
  return snapshots;
}

async function refreshSessions() {
  const snapshots = await service.Sessions();
  const session = state.selectedSelector
    ? snapshots.find((snapshot) => sessionMatches(snapshot, state.selectedSelector)) || null
    : null;

  setCurrentSession(session);
  return snapshots;
}

async function openSelectedSession(request: OpenSessionRequest) {
  const selector = (request.selector || state.selectedSelector).trim();
  if (!selector) throw new Error("authenticator selection is required");

  const snapshots = await service.Sessions();
  const openSessions = snapshots.filter(sessionIsOpen);
  const existing = openSessions.find((snapshot) => sessionMatches(snapshot, selector));
  const onlySelectedSession = existing && openSessions.every((snapshot) => sessionMatches(snapshot, selector));

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
  return snapshot;
}

export const api = {
  async discover(request: DiscoverRequest = {}): Promise<Discovery> {
    try {
      const snapshot = await service.Discover(request);

      state.devices = snapshot.devices;
      state.selectedDevice = state.selectedSelector ? reportForSelector(state.selectedSelector) : null;
      if (!state.selectedDevice) state.selectedSelector = "";
      if (!state.selectedSelector && state.devices.length === 1) {
        state.selectedDevice = state.devices[0];
        state.selectedSelector = selectorFromDevice(state.selectedDevice);
      }

      if (state.selectedSelector) {
        await openSelectedSession({ selector: state.selectedSelector });
      } else {
        await closeOpenSessions();
      }
      return discovery();
    } catch (error) {
      return discovery(runtimeErrorFrom(error), state.selectedSelector ? "error" : "idle");
    }
  },

  async select(selector: string): Promise<Discovery> {
    const requestedSelector = selector.trim();
    state.selectedDevice = requestedSelector ? reportForSelector(requestedSelector) : null;
    state.selectedSelector = state.selectedDevice ? selectorFromDevice(state.selectedDevice) : "";

    try {
      if (state.selectedSelector) {
        await openSelectedSession({ selector: state.selectedSelector });
      } else {
        await closeOpenSessions();
      }
      return discovery();
    } catch (error) {
      return discovery(runtimeErrorFrom(error), state.selectedSelector ? "error" : "idle");
    }
  },

  async openSession(request: OpenSessionRequest): Promise<SessionStatus> {
    return statusFromSession(await openSelectedSession(request));
  },

  async sessions(): Promise<SessionStatus[]> {
    return (await refreshSessions()).map((snapshot) => statusFromSession(snapshot));
  },

  async session(): Promise<SessionStatus> {
    await refreshSessions();
    return statusFromSession();
  },

  sessionStatus(): Promise<SessionStatus> {
    return api.session();
  },

  async closeSession(id: SessionID): Promise<SessionStatus> {
    setCurrentSession(await service.CloseSession(id));
    return statusFromSession(state.currentSession, "closed");
  },

  async closeAllSessions(): Promise<SessionStatus[]> {
    const closed = await service.CloseAllSessions();
    state.currentSession = null;
    return closed.map((snapshot) => statusFromSession(snapshot, "closed"));
  },

  cancelOperation(request: CancelOperationRequest): Promise<boolean> {
    return service.CancelOperation(request);
  },

  resolveInteraction(answer: InteractionAnswer): Promise<boolean> {
    return service.ResolveInteraction(answer);
  },

  inspect(request: OperationRequest): Promise<OperationEnvelope> {
    return service.Inspect(request);
  },

  bioSensorInfo(request: OperationRequest): Promise<OperationEnvelope> {
    return service.BioSensorInfo(request);
  },

  lookupMDS(request: MDSLookupRequest): Promise<MDSLookupEnvelope> {
    return service.LookupMDS(request);
  },
} as const;
