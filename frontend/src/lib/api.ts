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

export function runtimeErrorFrom(error: unknown): RuntimeErrorEnvelope {
  const source = error as { category?: RuntimeErrorEnvelope["category"]; message?: string; error?: { message?: string } };
  const nestedMessage = source.error ? source.error.message : "";
  return new RuntimeErrorEnvelope({
    category: source.category,
    message: source.message || nestedMessage || (error instanceof Error ? error.message : String(error || "operation failed")),
  });
}

export function selectorFromDevice(device: DeviceReport | null | undefined) {
  return device?.deviceId || device?.ordinalAlias || "";
}

export function reportForSelector(devices: DeviceReport[], selector: string) {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return null;
  return devices.find((device) => device.deviceId === requestedSelector || device.ordinalAlias === requestedSelector) || null;
}

export function labelForDevice(device: DeviceReport) {
  const name = [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId;
  return [name, device.serial].filter(Boolean).join(" · ");
}

export function idleSessionStatus(
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  state: SessionStatus["state"] = selectedSelector ? "closed" : "idle",
  error?: RuntimeErrorEnvelope | null,
): SessionStatus {
  const status: SessionStatus = {
    selectedSelector,
    selectedDevice,
    state,
  };
  if (selectedDevice) {
    status.deviceId = selectedDevice.deviceId;
    status.deviceLabel = labelForDevice(selectedDevice);
  }
  if (error) status.error = error;
  return status;
}

export function sessionIsOpen(snapshot: SessionSnapshot) {
  return !snapshot.info.closed;
}

export function sessionMatches(snapshot: SessionSnapshot, selector: string) {
  const requestedSelector = selector.trim();
  return sessionIsOpen(snapshot) && (snapshot.info.device.deviceId === requestedSelector || snapshot.info.device.ordinalAlias === requestedSelector);
}

export function statusFromSession(
  snapshot: SessionSnapshot,
  stateOverride?: SessionStatus["state"],
  error?: RuntimeErrorEnvelope | null,
): SessionStatus {
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

export const api = {
  async discover(request: DiscoverRequest = {}): Promise<DeviceReport[]> {
    return (await service.Discover(request)).devices;
  },

  openSession(request: OpenSessionRequest): Promise<SessionSnapshot> {
    return service.OpenSession(request);
  },

  sessions(): Promise<SessionSnapshot[]> {
    return service.Sessions();
  },

  closeSession(id: SessionID): Promise<SessionSnapshot> {
    return service.CloseSession(id);
  },

  closeAllSessions(): Promise<SessionSnapshot[]> {
    return service.CloseAllSessions();
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
