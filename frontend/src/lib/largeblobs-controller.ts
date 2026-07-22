import { get } from "svelte/store";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import {
  BlobState,
  DecodeMode,
  LargeBlobKeyState,
  MutationOperation,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobGarbageCollectRequest,
  LargeBlobListRequest,
  LargeBlobMutationEnvelope,
  LargeBlobMutationRequest,
  LargeBlobReadEnvelope,
  LargeBlobReadRequest,
} from "../../bindings/telesma/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  largeBlobListReport,
  largeBlobMutationPreview,
  largeBlobMutationResult,
  largeBlobReadReport,
} from "./ctapkit-results.js";
import {
  beginLargeBlobsInventoryLoad,
  completeLargeBlobsInventoryLoad,
  failLargeBlobsInventoryLoadAtRuntime,
  failLargeBlobsInventoryLoadWithResponse,
  largeBlobsDecodeMode,
  largeBlobsInventoryState,
  largeBlobsMutation,
  largeBlobsPayloadEncoding,
  largeBlobsQuery,
  largeBlobsReadState,
  largeBlobsSelectedCredentialID,
  largeBlobsStatusFilter,
  largeBlobsVerificationFlow,
  resetLargeBlobReadState,
  resetLargeBlobsDeviceState,
  type LargeBlobMutationFailureReason,
  type LargeBlobMutationState,
  type LargeBlobWriteDraft,
  type LargeBlobsStatusFilter,
} from "./features/largeblobs/state.js";
import { selectedSelector, authenticatorStatus } from "./features/authenticator/state.js";
import { activeScreen } from "./features/workbench/state.js";
import {
  parseLargeBlobPayload,
  type LargeBlobPayloadEncoding,
  type LargeBlobPayloadValidationError,
} from "./largeblobs-payload.js";
import { findLargeBlobCredential } from "./largeblobs-presentation.js";
import { runtimeFailureFrom } from "./failure.js";
import { currentSelectionID } from "./authenticator-boundary.js";
import {
  editingMutation,
  executingMutation,
  failedEditableMutation,
  failedMutation,
  idleMutation,
  mutationExecutionContext,
  previewingMutation,
  reviewedMutation,
  type MutationFailedPhase,
} from "./mutation-lifecycle.js";
import {
  completeOperation,
  operationStageFailureDetails,
  runOperation,
  runTypedOperationStage,
} from "./operation-lifecycle.js";
import {
  setStatusOutcome,
} from "./workbench-state.js";

function largeBlobsAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const selectionId = get(authenticatorStatus).selectionId || "";
  return selector && selectionId ? `${selector}:${selectionId}` : "";
}

function shouldAutoLoadLargeBlobs() {
  const inventory = get(largeBlobsInventoryState);
  return get(activeScreen) === "large-blobs"
    && Boolean(largeBlobsAutoLoadKey())
    && !inventory.lastSuccessfulEnvelope
    && inventory.phase !== "loading"
    && inventory.phase !== "refreshing"
    && inventory.phase !== "unsupported";
}

function reconcileSelectedCredential() {
  const selectedID = get(largeBlobsSelectedCredentialID);
  if (!selectedID) return;
  const report = largeBlobListReport(get(largeBlobsInventoryState).lastSuccessfulEnvelope);
  if (findLargeBlobCredential(report, selectedID)) return;
  largeBlobsSelectedCredentialID.set("");
  resetLargeBlobReadState();
  largeBlobsMutation.set(idleMutation());
}

export async function maybeLoadLargeBlobs() {
  if (!shouldAutoLoadLargeBlobs()) return;
  await loadLargeBlobs();
}

export async function loadLargeBlobs() {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    resetLargeBlobsDeviceState();
    return false;
  }

  beginLargeBlobsInventoryLoad();
  const label = m.large_blob_list();
  const request: LargeBlobListRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(largeBlobsVerificationFlow),
  };
  const attempt = await runOperation({
    label,
    call: () => api.listLargeBlobs(request),
    onRuntimeFailure: failLargeBlobsInventoryLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const report = largeBlobListReport(envelope);
  if (envelope.error || !report) {
    failLargeBlobsInventoryLoadWithResponse(envelope);
  } else {
    completeLargeBlobsInventoryLoad(envelope, new Date().toISOString());
    resetLargeBlobReadState();
    reconcileSelectedCredential();
  }
  completeOperation(label, envelope, { contractValid: Boolean(report) });
  const selectedCredentialID = get(largeBlobsSelectedCredentialID);
  if (!envelope.error && report && selectedCredentialID) {
    await readLargeBlob(selectedCredentialID);
  }
  return !envelope.error && Boolean(report);
}

export function setLargeBlobsQuery(value: string) {
  largeBlobsQuery.set(value);
}

export function setLargeBlobsStatusFilter(value: LargeBlobsStatusFilter) {
  largeBlobsStatusFilter.set(value);
}

export async function selectLargeBlobCredential(credentialIDHex: string): Promise<boolean> {
  if (get(largeBlobsSelectedCredentialID) === credentialIDHex) return true;
  largeBlobsSelectedCredentialID.set(credentialIDHex);
  resetLargeBlobReadState();
  largeBlobsMutation.set(idleMutation());
  if (!credentialIDHex) return true;
  return readLargeBlob(credentialIDHex);
}

export function setLargeBlobsVerificationFlow(value: VerificationFlow) {
  largeBlobsVerificationFlow.set(value);
}

export async function setLargeBlobsDecodeMode(value: DecodeMode): Promise<boolean> {
  if (get(largeBlobsDecodeMode) === value) return true;
  largeBlobsDecodeMode.set(value);
  resetLargeBlobReadState();
  const credentialIDHex = get(largeBlobsSelectedCredentialID);
  if (!credentialIDHex) return true;
  return readLargeBlob(credentialIDHex);
}

export function setLargeBlobsPayloadEncoding(value: LargeBlobPayloadEncoding) {
  largeBlobsPayloadEncoding.set(value);
  const current = get(largeBlobsMutation);
  if (current.kind !== "write") return;
  largeBlobsMutation.set(editingLargeBlobWrite({
    ...writeMutationBase(current),
    draft: { ...current.draft, encoding: value },
  }, null));
}

function reportForActions() {
  const inventory = get(largeBlobsInventoryState);
  if (inventory.phase === "loading" || inventory.phase === "refreshing") return null;
  const authenticator = get(authenticatorStatus);
  if (authenticator.state !== "ready" || !authenticator.selectionId) return null;
  const report = largeBlobListReport(inventory.lastSuccessfulEnvelope);
  return report?.support.largeBlobs ? report : null;
}

function targetForMutation(credentialIDHex: string) {
  const target = findLargeBlobCredential(reportForActions(), credentialIDHex);
  return target?.largeBlobKeyState === LargeBlobKeyState.LargeBlobKeyAvailable ? target : null;
}

function writeMutationBase(current: Extract<LargeBlobMutationState, { kind: "write" }>) {
  return {
    kind: "write" as const,
    credentialIDHex: current.credentialIDHex,
    draft: current.draft,
  };
}

function deleteMutationBase(credentialIDHex: string) {
  return { kind: "delete" as const, credentialIDHex };
}

function cleanupMutationBase() {
  return { kind: "cleanup" as const };
}

function editingLargeBlobWrite(
  base: ReturnType<typeof writeMutationBase>,
  validationError: LargeBlobPayloadValidationError | null,
) {
  return editingMutation(base, validationError);
}

export function buildLargeBlobReadRequest(
  selectionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
  decodeMode: DecodeMode,
): LargeBlobReadRequest {
  return {
    selectionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    decodeMode,
  };
}

function readError(
  credentialIDHex: string,
  request: LargeBlobReadRequest | null,
  responseEnvelope: LargeBlobReadEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: "response-error" | "runtime-error" | "missing-result",
) {
  largeBlobsReadState.set({
    phase: "error",
    credentialIDHex,
    request,
    responseEnvelope,
    runtimeError,
    failureReason,
  });
}

export async function readLargeBlob(credentialIDHex = get(largeBlobsSelectedCredentialID)): Promise<boolean> {
  const inventory = reportForActions();
  if (!inventory || !findLargeBlobCredential(inventory, credentialIDHex)) return false;

  const request = buildLargeBlobReadRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
    credentialIDHex,
    get(largeBlobsDecodeMode),
  );

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsReadState.set({ phase: "loading", credentialIDHex, request });
  const label = m.large_blob_read();
  const attempt = await runOperation({
    label,
    call: () => api.readLargeBlob(request),
    onRuntimeFailure: (error) => readError(credentialIDHex, request, null, error, "runtime-error"),
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const report = largeBlobReadReport(envelope);
  if (envelope.error) {
    readError(credentialIDHex, request, envelope, null, "response-error");
  } else if (!report) {
    readError(credentialIDHex, request, envelope, null, "missing-result");
  } else {
    largeBlobsReadState.set({ phase: "ready", credentialIDHex, request, responseEnvelope: envelope });
  }
  completeOperation(label, envelope, { contractValid: Boolean(report) });
  return !envelope.error && Boolean(report);
}

export function buildLargeBlobDeletePreviewRequest(
  selectionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
): LargeBlobMutationRequest {
  return {
    selectionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    dryRun: true,
  };
}

export function buildLargeBlobCleanupPreviewRequest(
  selectionId: string,
  verificationFlow: VerificationFlow,
): LargeBlobGarbageCollectRequest {
  return {
    selectionId,
    verificationFlow,
    dryRun: true,
  };
}

export function beginLargeBlobWrite(credentialIDHex = get(largeBlobsSelectedCredentialID)) {
  const target = targetForMutation(credentialIDHex);
  if (!target) return false;

  let draft: LargeBlobWriteDraft = {
    payload: "",
    encoding: get(largeBlobsPayloadEncoding),
  };
  const blobPresent = target.blobPresent || target.blobState === BlobState.BlobStatePresent;
  if (blobPresent) {
    const readState = get(largeBlobsReadState);
    if (readState.phase !== "ready" || readState.credentialIDHex !== credentialIDHex) return false;
    const report = largeBlobReadReport(readState.responseEnvelope);
    if (!report || !(report.blobPresent || report.array.blobState === BlobState.BlobStatePresent)) return false;

    if (
      report.decode.success
      && report.decode.mode === DecodeMode.DecodeModeUTF8
      && report.decode.decodedText !== undefined
    ) {
      draft = { payload: report.decode.decodedText, encoding: "utf8" };
    } else {
      draft = { payload: report.rawHex ?? "", encoding: "hex" };
    }
  }

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsMutation.set(editingLargeBlobWrite({
    kind: "write" as const,
    credentialIDHex,
    draft,
  }, null));
  return true;
}

export function updateLargeBlobWriteDraft(patch: Partial<LargeBlobWriteDraft>) {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write") return false;
  const draft = { ...current.draft, ...patch };
  largeBlobsPayloadEncoding.set(draft.encoding);
  largeBlobsMutation.set(editingLargeBlobWrite({
    ...writeMutationBase(current),
    draft,
  }, null));
  return true;
}

export function editLargeBlobWrite() {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "review" && current.phase !== "error")) return false;
  largeBlobsMutation.set(editingLargeBlobWrite(writeMutationBase(current), null));
  return true;
}

function writeError(
  current: Extract<LargeBlobMutationState, { kind: "write" }>,
  failedPhase: MutationFailedPhase,
  previewRequest: LargeBlobMutationRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set(failedEditableMutation(writeMutationBase(current), {
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }));
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "editing" && current.phase !== "error")) return false;
  if (!targetForMutation(current.credentialIDHex)) return false;

  const payload = parseLargeBlobPayload(current.draft.payload, current.draft.encoding);
  if (!payload.ok) {
    largeBlobsMutation.set(editingLargeBlobWrite(writeMutationBase(current), payload.error));
    return false;
  }

  const request: LargeBlobMutationRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(largeBlobsVerificationFlow),
    credentialIdHex: current.credentialIDHex,
    payload: payload.base64,
    dryRun: true,
  };

  largeBlobsMutation.set(previewingMutation(writeMutationBase(current), request));
  const label = m.large_blob_write();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.writeLargeBlob(request),
    extract: largeBlobMutationPreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      writeError(current, "previewing", request, null, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: (_preview, envelope) => largeBlobsMutation.set(
      reviewedMutation(writeMutationBase(current), request, envelope),
    ),
  });
  return outcome.ok;
}

function deleteError(
  credentialIDHex: string,
  failedPhase: MutationFailedPhase,
  previewRequest: LargeBlobMutationRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set(failedMutation(deleteMutationBase(credentialIDHex), {
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }));
}

export async function beginLargeBlobDelete(credentialIDHex = get(largeBlobsSelectedCredentialID)): Promise<boolean> {
  if (!targetForMutation(credentialIDHex)) return false;
  const request = buildLargeBlobDeletePreviewRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
    credentialIDHex,
  );

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsMutation.set(previewingMutation(deleteMutationBase(credentialIDHex), request));
  const label = m.large_blob_delete();
  let noop = false;
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.deleteLargeBlob(request),
    extract: largeBlobMutationPreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      deleteError(credentialIDHex, "previewing", request, null, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: (preview, envelope) => {
      noop = preview.operation === MutationOperation.MutationNoBlob
        || preview.noBlob
        || preview.noop === true;
      if (noop) {
        largeBlobsMutation.set(idleMutation());
        return;
      }
      largeBlobsMutation.set(reviewedMutation(
        deleteMutationBase(credentialIDHex),
        request,
        envelope,
      ));
    },
    completion: (preview) => {
      noop = Boolean(preview && (
        preview.operation === MutationOperation.MutationNoBlob
        || preview.noBlob
        || preview.noop === true
      ));
      return { summarize: !noop };
    },
  });
  if (noop) {
    setStatusOutcome({
      tone: "info",
      title: m.large_blob_delete(),
      message: m.large_blob_delete_noop(),
    });
  }
  return outcome.ok;
}

function cleanupError(
  failedPhase: MutationFailedPhase,
  previewRequest: LargeBlobGarbageCollectRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set(failedMutation(cleanupMutationBase(), {
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }));
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!reportForActions()) return false;
  const request = buildLargeBlobCleanupPreviewRequest(currentSelectionID(), get(largeBlobsVerificationFlow));

  largeBlobsMutation.set(previewingMutation(cleanupMutationBase(), request));
  const label = m.large_blob_cleanup_preview();
  let noop = false;
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.garbageCollectLargeBlobs(request),
    extract: largeBlobMutationPreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      cleanupError("previewing", request, null, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: (preview, envelope) => {
      noop = preview.noop === true;
      if (noop) {
        largeBlobsMutation.set(idleMutation());
        return;
      }
      largeBlobsMutation.set(reviewedMutation(cleanupMutationBase(), request, envelope));
    },
    completion: (preview) => {
      noop = preview?.noop === true;
      return { summarize: !noop };
    },
  });
  if (noop) {
    setStatusOutcome({
      tone: "info",
      title: m.large_blob_cleanup(),
      message: m.large_blob_cleanup_noop(),
    });
  }
  return outcome.ok;
}

async function refreshAfterMutation() {
  largeBlobsMutation.set(idleMutation());
  await loadLargeBlobs();
}

export async function confirmLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext(current);
  if (!execution) return false;
  const { previewRequest, previewEnvelope } = execution;
  const request: LargeBlobMutationRequest = {
    ...previewRequest,
    dryRun: false,
  };
  largeBlobsMutation.set(executingMutation(
    writeMutationBase(current),
    previewRequest,
    previewEnvelope,
  ));
  const label = m.large_blob_write();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.writeLargeBlob(request),
    extract: largeBlobMutationResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      writeError(current, "executing", previewRequest, previewEnvelope, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
  });
  if (!outcome.ok) return false;
  await refreshAfterMutation();
  return true;
}

export async function confirmLargeBlobDelete(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "delete" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext(current);
  if (!execution) return false;
  const { previewRequest, previewEnvelope } = execution;
  const request: LargeBlobMutationRequest = {
    ...previewRequest,
    dryRun: false,
  };
  largeBlobsMutation.set(executingMutation(
    deleteMutationBase(current.credentialIDHex),
    previewRequest,
    previewEnvelope,
  ));
  const label = m.large_blob_delete();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.deleteLargeBlob(request),
    extract: largeBlobMutationResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      deleteError(current.credentialIDHex, "executing", previewRequest, previewEnvelope, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
  });
  if (!outcome.ok) return false;
  await refreshAfterMutation();
  return true;
}

export async function confirmLargeBlobCleanup(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "cleanup" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext(current);
  if (!execution) return false;
  const { previewRequest, previewEnvelope } = execution;
  const request: LargeBlobGarbageCollectRequest = {
    ...previewRequest,
    dryRun: false,
  };
  largeBlobsMutation.set(executingMutation(
    cleanupMutationBase(),
    previewRequest,
    previewEnvelope,
  ));
  const label = m.large_blob_cleanup();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.garbageCollectLargeBlobs(request),
    extract: largeBlobMutationResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      cleanupError("executing", previewRequest, previewEnvelope, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
  });
  if (!outcome.ok) return false;
  await refreshAfterMutation();
  return true;
}

export function closeLargeBlobMutation() {
  largeBlobsMutation.set(idleMutation());
}
