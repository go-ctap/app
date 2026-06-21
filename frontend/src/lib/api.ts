import * as service from "../../bindings/fidobench/ctapkitservice";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import {
  RuntimeErrorEnvelope,
  type AlwaysUVRequest,
  type BioEnrollRequest,
  type BioRemoveRequest,
  type BioRenameRequest,
  type CancelOperationRequest,
  type CredentialDeleteRequest,
  type CredentialUpdateRequest,
  type DiscoverRequest,
  type GetAssertionRequest,
  type InteractionAnswer,
  type LargeBlobGarbageCollectRequest,
  type LargeBlobMutationRequest,
  type LargeBlobReadRequest,
  type MDSLookupEnvelope,
  type MDSLookupRequest,
  type MakeCredentialRequest,
  type MinPINLengthRequest,
  type OpenSessionRequest,
  type OperationEnvelope,
  type OperationRequest,
  type PINChangeRequest,
  type PINSetRequest,
  type ResetFactoryRequest,
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

  listCredentials(request: OperationRequest): Promise<OperationEnvelope> {
    return service.ListCredentials(request);
  },

  deleteCredential(request: CredentialDeleteRequest): Promise<OperationEnvelope> {
    return service.DeleteCredential(request);
  },

  updateCredentialUser(request: CredentialUpdateRequest): Promise<OperationEnvelope> {
    return service.UpdateCredentialUser(request);
  },

  readLargeBlob(request: LargeBlobReadRequest): Promise<OperationEnvelope> {
    return service.ReadLargeBlob(request);
  },

  listLargeBlobs(request: OperationRequest): Promise<OperationEnvelope> {
    return service.ListLargeBlobs(request);
  },

  writeLargeBlob(request: LargeBlobMutationRequest): Promise<OperationEnvelope> {
    return service.WriteLargeBlob(request);
  },

  deleteLargeBlob(request: LargeBlobMutationRequest): Promise<OperationEnvelope> {
    return service.DeleteLargeBlob(request);
  },

  garbageCollectLargeBlobs(request: LargeBlobGarbageCollectRequest): Promise<OperationEnvelope> {
    return service.GarbageCollectLargeBlobs(request);
  },

  configStatus(request: OperationRequest): Promise<OperationEnvelope> {
    return service.ConfigStatus(request);
  },

  setPIN(request: PINSetRequest): Promise<OperationEnvelope> {
    return service.SetPIN(request);
  },

  changePIN(request: PINChangeRequest): Promise<OperationEnvelope> {
    return service.ChangePIN(request);
  },

  setAlwaysUV(request: AlwaysUVRequest): Promise<OperationEnvelope> {
    return service.SetAlwaysUV(request);
  },

  setMinPINLength(request: MinPINLengthRequest): Promise<OperationEnvelope> {
    return service.SetMinPINLength(request);
  },

  bioList(request: OperationRequest): Promise<OperationEnvelope> {
    return service.BioList(request);
  },

  bioEnroll(request: BioEnrollRequest): Promise<OperationEnvelope> {
    return service.BioEnroll(request);
  },

  bioRename(request: BioRenameRequest): Promise<OperationEnvelope> {
    return service.BioRename(request);
  },

  bioRemove(request: BioRemoveRequest): Promise<OperationEnvelope> {
    return service.BioRemove(request);
  },

  resetFactory(request: ResetFactoryRequest): Promise<OperationEnvelope> {
    return service.ResetFactory(request);
  },

  makeCredential(request: MakeCredentialRequest): Promise<OperationEnvelope> {
    return service.MakeCredential(request);
  },

  getAssertion(request: GetAssertionRequest): Promise<OperationEnvelope> {
    return service.GetAssertion(request);
  },

  lookupMDS(request: MDSLookupRequest): Promise<MDSLookupEnvelope> {
    return service.LookupMDS(request);
  },
} as const;
