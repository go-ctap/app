import { get } from "svelte/store";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
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
} from "../../bindings/github.com/go-ctap/kit/service";
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
import { parseLargeBlobPayload, type LargeBlobPayloadEncoding } from "./largeblobs-payload.js";
import { findLargeBlobCredential } from "./largeblobs-presentation.js";
import { internalFailure, runtimeFailureFrom } from "./failure.js";
import { applyInvalidSelectionError, applyOperationAuthenticatorBoundary, currentSelectionID } from "./authenticator-boundary.js";
import {
  beginOperation,
  finishOperation,
  setStatusOutcome,
  summarizeEnvelope,
  summarizeOperationContractFailure,
  summarizeOperationFailure,
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
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
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
  try {
    beginOperation(m.large_blob_list());
    const request: LargeBlobListRequest = {
      selectionId: currentSelectionID(),
      verificationFlow: get(largeBlobsVerificationFlow),
    };
    const envelope = await api.listLargeBlobs(request);
    const report = largeBlobListReport(envelope);
    if (envelope.error || !report) {
      failLargeBlobsInventoryLoadWithResponse(envelope);
    } else {
      completeLargeBlobsInventoryLoad(envelope, new Date().toISOString());
      resetLargeBlobReadState();
      reconcileSelectedCredential();
    }
    if (envelope.error || report) {
      summarizeEnvelope(m.large_blob_list(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_list(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    const selectedCredentialID = get(largeBlobsSelectedCredentialID);
    if (!envelope.error && report && selectedCredentialID) {
      await readLargeBlob(selectedCredentialID);
    }
    return !envelope.error && Boolean(report);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    failLargeBlobsInventoryLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.large_blob_list(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
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
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
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
  largeBlobsMutation.set({
    kind: "write",
    phase: "editing",
    credentialIDHex: current.credentialIDHex,
    draft: { ...current.draft, encoding: value },
    validationError: null,
  });
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
  const report = reportForActions();
  if (!report || !findLargeBlobCredential(report, credentialIDHex)) return false;

  const request = buildLargeBlobReadRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
    credentialIDHex,
    get(largeBlobsDecodeMode),
  );

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsReadState.set({ phase: "loading", credentialIDHex, request });
  try {
    beginOperation(m.large_blob_read());
    const envelope = await api.readLargeBlob(request);
    const report = largeBlobReadReport(envelope);
    if (envelope.error) {
      readError(credentialIDHex, request, envelope, null, "response-error");
    } else if (!report) {
      readError(credentialIDHex, request, envelope, null, "missing-result");
    } else {
      largeBlobsReadState.set({ phase: "ready", credentialIDHex, request, responseEnvelope: envelope });
    }
    if (envelope.error || report) {
      summarizeEnvelope(m.large_blob_read(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_read(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    return !envelope.error && Boolean(report);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    readError(credentialIDHex, request, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_read(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
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
  largeBlobsMutation.set({
    kind: "write",
    phase: "editing",
    credentialIDHex,
    draft,
    validationError: null,
  });
  return true;
}

export function updateLargeBlobWriteDraft(patch: Partial<LargeBlobWriteDraft>) {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write") return false;
  const draft = { ...current.draft, ...patch };
  largeBlobsPayloadEncoding.set(draft.encoding);
  largeBlobsMutation.set({
    kind: "write",
    phase: "editing",
    credentialIDHex: current.credentialIDHex,
    draft,
    validationError: null,
  });
  return true;
}

export function editLargeBlobWrite() {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "review" && current.phase !== "error")) return false;
  largeBlobsMutation.set({
    kind: "write",
    phase: "editing",
    credentialIDHex: current.credentialIDHex,
    draft: current.draft,
    validationError: null,
  });
  return true;
}

function writeError(
  current: Extract<LargeBlobMutationState, { kind: "write" }>,
  failedPhase: "previewing" | "executing",
  previewRequest: LargeBlobMutationRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set({
    kind: "write",
    phase: "error",
    credentialIDHex: current.credentialIDHex,
    draft: current.draft,
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
    validationError: null,
  });
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "editing" && current.phase !== "error")) return false;
  if (!targetForMutation(current.credentialIDHex)) return false;

  const payload = parseLargeBlobPayload(current.draft.payload, current.draft.encoding);
  if (!payload.ok) {
    largeBlobsMutation.set({
      kind: "write",
      phase: "editing",
      credentialIDHex: current.credentialIDHex,
      draft: current.draft,
      validationError: payload.error,
    });
    return false;
  }

  const request: LargeBlobMutationRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(largeBlobsVerificationFlow),
    credentialIdHex: current.credentialIDHex,
    payload: payload.base64,
    dryRun: true,
  };

  largeBlobsMutation.set({ ...current, phase: "previewing", previewRequest: request });
  try {
    beginOperation(m.large_blob_write());
    const envelope = await api.writeLargeBlob(request);
    const preview = largeBlobMutationPreview(envelope);
    if (envelope.error) {
      writeError(current, "previewing", request, null, envelope, null, "response-error");
    } else if (!preview) {
      writeError(current, "previewing", request, null, envelope, null, "missing-preview");
    } else {
      largeBlobsMutation.set({
        ...current,
        phase: "review",
        previewRequest: request,
        previewEnvelope: envelope,
      });
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.large_blob_write(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_write(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    writeError(current, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_write(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

function deleteError(
  credentialIDHex: string,
  failedPhase: "previewing" | "executing",
  previewRequest: LargeBlobMutationRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set({
    kind: "delete",
    phase: "error",
    credentialIDHex,
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  });
}

export async function beginLargeBlobDelete(credentialIDHex = get(largeBlobsSelectedCredentialID)): Promise<boolean> {
  if (!targetForMutation(credentialIDHex)) return false;
  const request = buildLargeBlobDeletePreviewRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
    credentialIDHex,
  );

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsMutation.set({ kind: "delete", phase: "previewing", credentialIDHex, previewRequest: request });
  try {
    beginOperation(m.large_blob_delete());
    const envelope = await api.deleteLargeBlob(request);
    const preview = largeBlobMutationPreview(envelope);
    if (envelope.error) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "response-error");
      summarizeEnvelope(m.large_blob_delete(), envelope);
    } else if (!preview) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "missing-preview");
      summarizeOperationContractFailure(m.large_blob_delete(), internalFailure());
    } else {
      const noop = preview.operation === MutationOperation.MutationNoBlob || preview.noBlob || preview.noop === true;
      if (noop) {
        largeBlobsMutation.set({ kind: "idle", phase: "idle" });
        finishOperation();
        setStatusOutcome({
          tone: "info",
          title: m.large_blob_delete(),
          message: m.large_blob_delete_noop(),
        });
      } else {
        largeBlobsMutation.set({
          kind: "delete",
          phase: "review",
          credentialIDHex,
          previewRequest: request,
          previewEnvelope: envelope,
        });
        summarizeEnvelope(m.large_blob_delete(), envelope);
      }
    }
    applyOperationAuthenticatorBoundary(envelope);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    deleteError(credentialIDHex, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_delete(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

function cleanupError(
  failedPhase: "previewing" | "executing",
  previewRequest: LargeBlobGarbageCollectRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: LargeBlobMutationFailureReason,
) {
  largeBlobsMutation.set({
    kind: "cleanup",
    phase: "error",
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  });
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!reportForActions()) return false;
  const request = buildLargeBlobCleanupPreviewRequest(currentSelectionID(), get(largeBlobsVerificationFlow));

  largeBlobsMutation.set({ kind: "cleanup", phase: "previewing", previewRequest: request });
  try {
    beginOperation(m.large_blob_cleanup_preview());
    const envelope = await api.garbageCollectLargeBlobs(request);
    const preview = largeBlobMutationPreview(envelope);
    if (envelope.error) {
      cleanupError("previewing", request, null, envelope, null, "response-error");
      summarizeEnvelope(m.large_blob_cleanup_preview(), envelope);
    } else if (!preview) {
      cleanupError("previewing", request, null, envelope, null, "missing-preview");
      summarizeOperationContractFailure(m.large_blob_cleanup_preview(), internalFailure());
    } else if (preview.noop === true) {
      largeBlobsMutation.set({ kind: "idle", phase: "idle" });
      finishOperation();
      setStatusOutcome({
        tone: "info",
        title: m.large_blob_cleanup(),
        message: m.large_blob_cleanup_noop(),
      });
    } else {
      largeBlobsMutation.set({
        kind: "cleanup",
        phase: "review",
        previewRequest: request,
        previewEnvelope: envelope,
      });
      summarizeEnvelope(m.large_blob_cleanup_preview(), envelope);
    }
    applyOperationAuthenticatorBoundary(envelope);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    cleanupError("previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_cleanup_preview(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

async function refreshAfterMutation() {
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
  await loadLargeBlobs();
}

export async function confirmLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || (current.phase !== "review" && current.phase !== "error")) return false;
  const { previewRequest, previewEnvelope } = current;
  if (!previewRequest || !previewEnvelope) return false;
  if (current.phase === "error" && current.failedPhase !== "executing") return false;
  const request: LargeBlobMutationRequest = {
    ...previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_write(),
  };
  largeBlobsMutation.set({
    kind: "write",
    phase: "executing",
    credentialIDHex: current.credentialIDHex,
    draft: current.draft,
    previewRequest,
    previewEnvelope,
  });
  try {
    beginOperation(m.large_blob_write());
    const envelope = await api.writeLargeBlob(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      writeError(current, "executing", previewRequest, previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      writeError(current, "executing", previewRequest, previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_write(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_write(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    writeError(current, "executing", previewRequest, previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_write(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

export async function confirmLargeBlobDelete(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "delete" || (current.phase !== "review" && current.phase !== "error")) return false;
  const { previewRequest, previewEnvelope } = current;
  if (!previewRequest || !previewEnvelope) return false;
  if (current.phase === "error" && current.failedPhase !== "executing") return false;
  const request: LargeBlobMutationRequest = {
    ...previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_delete(),
  };
  largeBlobsMutation.set({
    kind: "delete",
    phase: "executing",
    credentialIDHex: current.credentialIDHex,
    previewRequest,
    previewEnvelope,
  });
  try {
    beginOperation(m.large_blob_delete());
    const envelope = await api.deleteLargeBlob(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      deleteError(current.credentialIDHex, "executing", previewRequest, previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      deleteError(current.credentialIDHex, "executing", previewRequest, previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_delete(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_delete(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    deleteError(current.credentialIDHex, "executing", previewRequest, previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_delete(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

export async function confirmLargeBlobCleanup(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "cleanup" || (current.phase !== "review" && current.phase !== "error")) return false;
  const { previewRequest, previewEnvelope } = current;
  if (!previewRequest || !previewEnvelope) return false;
  if (current.phase === "error" && current.failedPhase !== "executing") return false;
  const request: LargeBlobGarbageCollectRequest = {
    ...previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_cleanup(),
  };
  largeBlobsMutation.set({
    kind: "cleanup",
    phase: "executing",
    previewRequest,
    previewEnvelope,
  });
  try {
    beginOperation(m.large_blob_cleanup());
    const envelope = await api.garbageCollectLargeBlobs(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      cleanupError("executing", previewRequest, previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      cleanupError("executing", previewRequest, previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_cleanup(), envelope);
    } else {
      summarizeOperationContractFailure(m.large_blob_cleanup(), internalFailure());
    }
    applyOperationAuthenticatorBoundary(envelope);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    cleanupError("executing", previewRequest, previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_cleanup(), runtimeError);
    applyInvalidSelectionError(runtimeError);
    return false;
  }
}

export function closeLargeBlobMutation() {
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
}
