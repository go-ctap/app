import * as applicationService from "../../bindings/telesma/appconfig/service";
import type { ApplicationConfig, ApplicationConfigSnapshot } from "../../bindings/telesma/appconfig";
import * as service from "../../bindings/telesma/ctapservice/service";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { LogJournalBatch } from "../../bindings/github.com/go-ctap/kit/model";
import type {
  GetAssertionVerification,
  MakeCredentialVerification,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import type { AttestationTrustAssessment } from "../../bindings/github.com/go-ctap/mds/model";
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
  type CredentialStoreStateEnvelope,
  type CredentialUpdateEnvelope,
  type CredentialUpdateRequest,
  type CredentialsEnvelope,
  type DiscoverRequest,
  type EnableLongTouchForResetRequest,
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
  type MakeCredentialAttestationAssessmentRequest,
  type MakeCredentialEnvelope,
  type MakeCredentialRequest,
  type MakeCredentialVerificationRequest,
  type MinPINLengthRequest,
  type OperationRequest,
  type PINEnvelope,
  type PINChangeRequest,
  type PINSetRequest,
  type ResetFactoryEnvelope,
  type ResetFactoryRequest,
  type ReadLogsRequest,
  type SelectionRequest,
  type SelectionSnapshot,
  type GetAssertionVerificationRequest,
} from "../../bindings/telesma/service";

import { runtimeCall } from "./features/logs/state.svelte.js";

export type OperationEnvelope =
  | InspectEnvelope
  | CredentialsEnvelope
  | CredentialStoreStateEnvelope
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
  loadApplicationConfig(): Promise<ApplicationConfigSnapshot> {
    return runtimeCall("application.config.load", () => applicationService.LoadApplicationConfig());
  },

  saveApplicationConfig(config: ApplicationConfig): Promise<void> {
    return runtimeCall("application.config.save", () => applicationService.SaveApplicationConfig(config));
  },

  readLogs(request: ReadLogsRequest): Promise<LogJournalBatch> {
    return runtimeCall("ctapkit.logs.read", () => service.ReadLogs(request));
  },

  clearLogs(): Promise<LogCursor> {
    return runtimeCall("ctapkit.logs.clear", () => service.ClearLogs());
  },

  async discover(request: DiscoverRequest = {}): Promise<DeviceReport[]> {
    return runtimeCall("ctapkit.discover", async () => (await service.Discover(request)).devices);
  },

  refreshDiscovery(request: DiscoverRequest = {}): Promise<void> {
    return runtimeCall("ctapkit.discovery.refresh", () => service.RefreshDiscovery(request));
  },

  setSelection(request: SelectionRequest): Promise<SelectionSnapshot> {
    return runtimeCall("ctapkit.selection.set", () => service.SetSelection(request));
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

  credentialStoreState(request: OperationRequest): Promise<CredentialStoreStateEnvelope> {
    return runtimeCall("ctapkit.operation.credentialStoreState", () => service.CredentialStoreState(request));
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

  enableLongTouchForReset(request: EnableLongTouchForResetRequest): Promise<AuthenticatorConfigEnvelope> {
    return runtimeCall("ctapkit.operation.enableLongTouchForReset", () => service.EnableLongTouchForReset(request));
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

  verifyMakeCredential(request: MakeCredentialVerificationRequest): Promise<MakeCredentialVerification> {
    return runtimeCall("ctapkit.verification.makeCredential", () => service.VerifyMakeCredential(request));
  },

  verifyGetAssertion(request: GetAssertionVerificationRequest): Promise<GetAssertionVerification> {
    return runtimeCall("ctapkit.verification.getAssertion", () => service.VerifyGetAssertion(request));
  },

  assessMakeCredentialAttestation(
    request: MakeCredentialAttestationAssessmentRequest,
  ): Promise<AttestationTrustAssessment> {
    return runtimeCall(
      "mds.attestation.assess",
      () => service.AssessMakeCredentialAttestation(request),
    );
  },

  lookupMDS(request: MDSLookupRequest): Promise<MDSLookupEnvelope> {
    return runtimeCall("mds.lookup", () => service.LookupMDS(request));
  },
} as const;
