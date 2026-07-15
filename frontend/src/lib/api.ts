import * as service from "../../bindings/fidobench/ctapkitservice";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { LogJournalBatch } from "../../bindings/github.com/go-ctap/kit/model";
import {
  type AlwaysUVRequest,
  type AuthenticatorConfigEnvelope,
  type BioEnrollEnvelope,
  type BioEnrollRequest,
  type BioListEnvelope,
  type BioMutationEnvelope,
  type BioRemoveRequest,
  type BioRenameRequest,
  type BioSensorEnvelope,
  type CancelOperationRequest,
  type ConfigStatusEnvelope,
  type CredentialDeleteEnvelope,
  type CredentialDeleteRequest,
  type CredentialListRequest,
  type CredentialUpdateEnvelope,
  type CredentialUpdateRequest,
  type CredentialsEnvelope,
  type DiscoverRequest,
  type GetAssertionEnvelope,
  type GetAssertionRequest,
  type InspectEnvelope,
  type InteractionAnswer,
  type LargeBlobGarbageCollectRequest,
  type LargeBlobListEnvelope,
  type LargeBlobListRequest,
  type LargeBlobMutationEnvelope,
  type LargeBlobMutationRequest,
  type LargeBlobReadEnvelope,
  type LargeBlobReadRequest,
  type LogCursor,
  type MDSLookupEnvelope,
  type MDSLookupRequest,
  type MakeCredentialEnvelope,
  type MakeCredentialRequest,
  type MinPINLengthRequest,
  type OpenSessionRequest,
  type OperationRequest,
  type PINEnvelope,
  type PINChangeRequest,
  type PINSetRequest,
  type ResetFactoryEnvelope,
  type ResetFactoryRequest,
  type ReadLogsRequest,
  type SessionSnapshot,
} from "../../bindings/github.com/go-ctap/kit/service";

import { runtimeCall } from "./features/logs/state.svelte.js";

export type OperationEnvelope =
  | InspectEnvelope
  | CredentialsEnvelope
  | CredentialDeleteEnvelope
  | CredentialUpdateEnvelope
  | LargeBlobReadEnvelope
  | LargeBlobListEnvelope
  | LargeBlobMutationEnvelope
  | ConfigStatusEnvelope
  | PINEnvelope
  | AuthenticatorConfigEnvelope
  | BioSensorEnvelope
  | BioListEnvelope
  | BioEnrollEnvelope
  | BioMutationEnvelope
  | ResetFactoryEnvelope
  | MakeCredentialEnvelope
  | GetAssertionEnvelope;

export const api = {
  readLogs(request: ReadLogsRequest): Promise<LogJournalBatch> {
    return runtimeCall("ctapkit.logs.read", () => service.ReadLogs(request));
  },

  clearLogs(): Promise<LogCursor> {
    return runtimeCall("ctapkit.logs.clear", () => service.ClearLogs());
  },

  async discover(request: DiscoverRequest = {}): Promise<DeviceReport[]> {
    return runtimeCall("ctapkit.discover", async () => (await service.Discover(request)).devices);
  },

  startDiscoveryMonitoring(): Promise<void> {
    return runtimeCall("ctapkit.discovery.startMonitoring", () => service.StartDiscoveryMonitoring());
  },

  refreshDiscovery(request: DiscoverRequest = {}): Promise<void> {
    return runtimeCall("ctapkit.discovery.refresh", () => service.RefreshDiscovery(request));
  },

  openSession(request: OpenSessionRequest): Promise<SessionSnapshot> {
    return runtimeCall("ctapkit.session.open", () => service.OpenSession(request));
  },

  sessions(): Promise<SessionSnapshot[]> {
    return runtimeCall("ctapkit.session.list", () => service.Sessions());
  },

  closeAllSessions(): Promise<SessionSnapshot[]> {
    return runtimeCall("ctapkit.session.closeAll", () => service.CloseAllSessions());
  },

  cancelOperation(request: CancelOperationRequest): Promise<boolean> {
    return runtimeCall("ctapkit.operation.cancel", () => service.CancelOperation(request));
  },

  resolveInteraction(answer: InteractionAnswer): Promise<boolean> {
    return runtimeCall("ctapkit.interaction.resolve", () => service.ResolveInteraction(answer));
  },

  inspect(request: OperationRequest): Promise<InspectEnvelope> {
    return runtimeCall("ctapkit.operation.inspect", () => service.Inspect(request));
  },

  bioSensorInfo(request: OperationRequest): Promise<BioSensorEnvelope> {
    return runtimeCall("ctapkit.operation.bioSensorInfo", () => service.BioSensorInfo(request));
  },

  listCredentials(request: CredentialListRequest): Promise<CredentialsEnvelope> {
    return runtimeCall("ctapkit.operation.listCredentials", () => service.ListCredentials(request));
  },

  deleteCredential(request: CredentialDeleteRequest): Promise<CredentialDeleteEnvelope> {
    return runtimeCall("ctapkit.operation.deleteCredential", () => service.DeleteCredential(request));
  },

  updateCredentialUser(request: CredentialUpdateRequest): Promise<CredentialUpdateEnvelope> {
    return runtimeCall("ctapkit.operation.updateCredentialUser", () => service.UpdateCredentialUser(request));
  },

  readLargeBlob(request: LargeBlobReadRequest): Promise<LargeBlobReadEnvelope> {
    return runtimeCall("ctapkit.operation.readLargeBlob", () => service.ReadLargeBlob(request));
  },

  listLargeBlobs(request: LargeBlobListRequest): Promise<LargeBlobListEnvelope> {
    return runtimeCall("ctapkit.operation.listLargeBlobs", () => service.ListLargeBlobs(request));
  },

  writeLargeBlob(request: LargeBlobMutationRequest): Promise<LargeBlobMutationEnvelope> {
    return runtimeCall("ctapkit.operation.writeLargeBlob", () => service.WriteLargeBlob(request));
  },

  deleteLargeBlob(request: LargeBlobMutationRequest): Promise<LargeBlobMutationEnvelope> {
    return runtimeCall("ctapkit.operation.deleteLargeBlob", () => service.DeleteLargeBlob(request));
  },

  garbageCollectLargeBlobs(request: LargeBlobGarbageCollectRequest): Promise<LargeBlobMutationEnvelope> {
    return runtimeCall("ctapkit.operation.garbageCollectLargeBlobs", () => service.GarbageCollectLargeBlobs(request));
  },

  configStatus(request: OperationRequest): Promise<ConfigStatusEnvelope> {
    return runtimeCall("ctapkit.operation.configStatus", () => service.ConfigStatus(request));
  },

  setPIN(request: PINSetRequest): Promise<PINEnvelope> {
    return runtimeCall("ctapkit.operation.setPIN", () => service.SetPIN(request));
  },

  changePIN(request: PINChangeRequest): Promise<PINEnvelope> {
    return runtimeCall("ctapkit.operation.changePIN", () => service.ChangePIN(request));
  },

  setAlwaysUV(request: AlwaysUVRequest): Promise<AuthenticatorConfigEnvelope> {
    return runtimeCall("ctapkit.operation.setAlwaysUV", () => service.SetAlwaysUV(request));
  },

  setMinPINLength(request: MinPINLengthRequest): Promise<AuthenticatorConfigEnvelope> {
    return runtimeCall("ctapkit.operation.setMinPINLength", () => service.SetMinPINLength(request));
  },

  bioList(request: OperationRequest): Promise<BioListEnvelope> {
    return runtimeCall("ctapkit.operation.bioList", () => service.BioList(request));
  },

  bioEnroll(request: BioEnrollRequest): Promise<BioEnrollEnvelope> {
    return runtimeCall("ctapkit.operation.bioEnroll", () => service.BioEnroll(request));
  },

  bioRename(request: BioRenameRequest): Promise<BioMutationEnvelope> {
    return runtimeCall("ctapkit.operation.bioRename", () => service.BioRename(request));
  },

  bioRemove(request: BioRemoveRequest): Promise<BioMutationEnvelope> {
    return runtimeCall("ctapkit.operation.bioRemove", () => service.BioRemove(request));
  },

  resetFactory(request: ResetFactoryRequest): Promise<ResetFactoryEnvelope> {
    return runtimeCall("ctapkit.operation.resetFactory", () => service.ResetFactory(request));
  },

  makeCredential(request: MakeCredentialRequest): Promise<MakeCredentialEnvelope> {
    return runtimeCall("ctapkit.operation.makeCredential", () => service.MakeCredential(request));
  },

  getAssertion(request: GetAssertionRequest): Promise<GetAssertionEnvelope> {
    return runtimeCall("ctapkit.operation.getAssertion", () => service.GetAssertion(request));
  },

  lookupMDS(request: MDSLookupRequest): Promise<MDSLookupEnvelope> {
    return runtimeCall("ctapkit.mds.lookup", () => service.LookupMDS(request));
  },
} as const;
