import { get } from "svelte/store";

import { ErrorCategory, VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import {
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
  largeBlobsInventoryIsStale,
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
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { parseLargeBlobPayload, type LargeBlobPayloadEncoding } from "./largeblobs-payload.js";
import { canRetryLargeBlobMutation, findLargeBlobCredential } from "./largeblobs-presentation.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { beginOperation, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

export type LoadLargeBlobsOptions = { refresh?: boolean };

function retryAction(action: () => Promise<unknown>) {
  return async () => {
    await action();
  };
}

function missingOperationOutput(kind: "preview" | "result") {
  return {
    category: ErrorCategory.ErrorInvalidState,
    message: kind === "preview" ? m.operation_missing_preview() : m.operation_missing_result(),
  };
}

function largeBlobsAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const sessionId = get(sessionStatus).sessionId || "";
  return selector && sessionId ? `${selector}:${sessionId}` : "";
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

export async function loadLargeBlobs(options: LoadLargeBlobsOptions = {}) {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    resetLargeBlobsDeviceState();
    return false;
  }

  const refresh = Boolean(options.refresh);
  if (refresh) resetLargeBlobReadState();
  beginLargeBlobsInventoryLoad();
  try {
    beginOperation(m.large_blob_list());
    const request: LargeBlobListRequest = {
      sessionId: selectedSessionId(),
      verificationFlow: get(largeBlobsVerificationFlow),
      refresh,
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
      summarizeEnvelope(m.large_blob_list(), envelope, retryAction(() => loadLargeBlobs({ refresh })));
    } else {
      summarizeOperationFailure(m.large_blob_list(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(report);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    failLargeBlobsInventoryLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.large_blob_list(), runtimeError, retryAction(() => loadLargeBlobs({ refresh })));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export function setLargeBlobsQuery(value: string) {
  largeBlobsQuery.set(value);
}

export function setLargeBlobsStatusFilter(value: LargeBlobsStatusFilter) {
  largeBlobsStatusFilter.set(value);
}

export function selectLargeBlobCredential(credentialIDHex: string) {
  if (get(largeBlobsSelectedCredentialID) === credentialIDHex) return;
  largeBlobsSelectedCredentialID.set(credentialIDHex);
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
}

export function setLargeBlobsVerificationFlow(value: VerificationFlow) {
  largeBlobsVerificationFlow.set(value);
}

export function setLargeBlobsDecodeMode(value: DecodeMode) {
  if (get(largeBlobsDecodeMode) === value) return;
  largeBlobsDecodeMode.set(value);
  resetLargeBlobReadState();
}

export function setLargeBlobsPayloadEncoding(value: LargeBlobPayloadEncoding) {
  largeBlobsPayloadEncoding.set(value);
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || current.phase !== "editing") return;
  largeBlobsMutation.set({
    ...current,
    draft: { ...current.draft, encoding: value },
    validationError: null,
  });
}

function reportForActions() {
  const inventory = get(largeBlobsInventoryState);
  if (largeBlobsInventoryIsStale(inventory) || inventory.phase === "loading" || inventory.phase === "refreshing") return null;
  const session = get(sessionStatus);
  if (session.state !== "ready" || !session.sessionId) return null;
  const report = largeBlobListReport(inventory.lastSuccessfulEnvelope);
  return report?.support.largeBlobs ? report : null;
}

function targetForMutation(credentialIDHex: string) {
  const target = findLargeBlobCredential(reportForActions(), credentialIDHex);
  return target?.largeBlobKeyState === LargeBlobKeyState.LargeBlobKeyAvailable ? target : null;
}

export function buildLargeBlobReadRequest(
  sessionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
  decodeMode: DecodeMode,
): LargeBlobReadRequest {
  return {
    sessionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    decodeMode,
  };
}

function readError(
  credentialIDHex: string,
  request: LargeBlobReadRequest | null,
  responseEnvelope: LargeBlobReadEnvelope | null,
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
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

  let request: LargeBlobReadRequest;
  try {
    request = buildLargeBlobReadRequest(
      selectedSessionId(),
      get(largeBlobsVerificationFlow),
      credentialIDHex,
      get(largeBlobsDecodeMode),
    );
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    readError(credentialIDHex, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_read(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

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
      summarizeEnvelope(m.large_blob_read(), envelope, retryAction(() => readLargeBlob(credentialIDHex)));
    } else {
      summarizeOperationFailure(m.large_blob_read(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(report);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    readError(credentialIDHex, request, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_read(), runtimeError, retryAction(() => readLargeBlob(credentialIDHex)));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export function buildLargeBlobWritePreviewRequest(
  sessionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
  draft: LargeBlobWriteDraft,
): LargeBlobMutationRequest {
  const payload = parseLargeBlobPayload(draft.payload, draft.encoding);
  if (!payload.ok) throw new Error(payload.error);
  return {
    sessionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    payload: payload.base64,
    dryRun: true,
  };
}

export function buildLargeBlobDeletePreviewRequest(
  sessionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
): LargeBlobMutationRequest {
  return {
    sessionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    dryRun: true,
  };
}

export function buildLargeBlobCleanupPreviewRequest(
  sessionId: string,
  verificationFlow: VerificationFlow,
): LargeBlobGarbageCollectRequest {
  return {
    sessionId,
    verificationFlow,
    dryRun: true,
  };
}

export function beginLargeBlobWrite(credentialIDHex = get(largeBlobsSelectedCredentialID)) {
  if (!targetForMutation(credentialIDHex)) return false;
  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsMutation.set({
    kind: "write",
    phase: "editing",
    credentialIDHex,
    draft: { payload: "", encoding: get(largeBlobsPayloadEncoding) },
    validationError: null,
  });
  return true;
}

export function updateLargeBlobWriteDraft(patch: Partial<LargeBlobWriteDraft>) {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || current.phase === "previewing" || current.phase === "executing") return false;
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
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
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

  let request: LargeBlobMutationRequest;
  try {
    request = {
      sessionId: selectedSessionId(),
      verificationFlow: get(largeBlobsVerificationFlow),
      credentialIdHex: current.credentialIDHex,
      payload: payload.base64,
      dryRun: true,
    };
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    writeError(current, "previewing", null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_write(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

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
      summarizeEnvelope(m.large_blob_write(), envelope, retryAction(previewLargeBlobWrite));
    } else {
      summarizeOperationFailure(m.large_blob_write(), missingOperationOutput("preview"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    writeError(current, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_write(), runtimeError, retryAction(previewLargeBlobWrite));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

function deleteError(
  credentialIDHex: string,
  failedPhase: "previewing" | "executing",
  previewRequest: LargeBlobMutationRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
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
  let request: LargeBlobMutationRequest;
  try {
    request = buildLargeBlobDeletePreviewRequest(
      selectedSessionId(),
      get(largeBlobsVerificationFlow),
      credentialIDHex,
    );
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(credentialIDHex, "previewing", null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_delete(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

  largeBlobsSelectedCredentialID.set(credentialIDHex);
  largeBlobsMutation.set({ kind: "delete", phase: "previewing", credentialIDHex, previewRequest: request });
  try {
    beginOperation(m.large_blob_delete());
    const envelope = await api.deleteLargeBlob(request);
    const preview = largeBlobMutationPreview(envelope);
    if (envelope.error) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "response-error");
    } else if (!preview) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "missing-preview");
    } else {
      const noop = preview.operation === MutationOperation.MutationNoBlob || preview.noBlob || preview.noop === true;
      largeBlobsMutation.set({
        kind: "delete",
        phase: noop ? "noop" : "review",
        credentialIDHex,
        previewRequest: request,
        previewEnvelope: envelope,
      });
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.large_blob_delete(), envelope, retryAction(() => beginLargeBlobDelete(credentialIDHex)));
    } else {
      summarizeOperationFailure(m.large_blob_delete(), missingOperationOutput("preview"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(credentialIDHex, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_delete(), runtimeError, retryAction(() => beginLargeBlobDelete(credentialIDHex)));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

function cleanupError(
  failedPhase: "previewing" | "executing",
  previewRequest: LargeBlobGarbageCollectRequest | null,
  previewEnvelope: LargeBlobMutationEnvelope | null,
  responseEnvelope: LargeBlobMutationEnvelope | null,
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
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
  let request: LargeBlobGarbageCollectRequest;
  try {
    request = buildLargeBlobCleanupPreviewRequest(selectedSessionId(), get(largeBlobsVerificationFlow));
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    cleanupError("previewing", null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_cleanup_preview(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

  largeBlobsMutation.set({ kind: "cleanup", phase: "previewing", previewRequest: request });
  try {
    beginOperation(m.large_blob_cleanup_preview());
    const envelope = await api.garbageCollectLargeBlobs(request);
    const preview = largeBlobMutationPreview(envelope);
    if (envelope.error) {
      cleanupError("previewing", request, null, envelope, null, "response-error");
    } else if (!preview) {
      cleanupError("previewing", request, null, envelope, null, "missing-preview");
    } else {
      largeBlobsMutation.set({
        kind: "cleanup",
        phase: preview.noop === true ? "noop" : "review",
        previewRequest: request,
        previewEnvelope: envelope,
      });
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.large_blob_cleanup_preview(), envelope, retryAction(beginLargeBlobCleanup));
    } else {
      summarizeOperationFailure(m.large_blob_cleanup_preview(), missingOperationOutput("preview"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    cleanupError("previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_cleanup_preview(), runtimeError, retryAction(beginLargeBlobCleanup));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

async function refreshAfterMutation() {
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
  await loadLargeBlobs({ refresh: true });
}

export async function confirmLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "write" || current.phase !== "review") return false;
  const request: LargeBlobMutationRequest = {
    ...current.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_write(),
  };
  largeBlobsMutation.set({ ...current, phase: "executing" });
  try {
    beginOperation(m.large_blob_write());
    const envelope = await api.writeLargeBlob(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      writeError(current, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      writeError(current, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_write(), envelope, retryAction(retryLargeBlobMutation));
    } else {
      summarizeOperationFailure(m.large_blob_write(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    writeError(current, "executing", current.previewRequest, current.previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_write(), runtimeError, retryAction(retryLargeBlobMutation));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function confirmLargeBlobDelete(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "delete" || current.phase !== "review") return false;
  const request: LargeBlobMutationRequest = {
    ...current.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_delete(),
  };
  largeBlobsMutation.set({ ...current, phase: "executing" });
  try {
    beginOperation(m.large_blob_delete());
    const envelope = await api.deleteLargeBlob(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_delete(), envelope, retryAction(retryLargeBlobMutation));
    } else {
      summarizeOperationFailure(m.large_blob_delete(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_delete(), runtimeError, retryAction(retryLargeBlobMutation));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function confirmLargeBlobCleanup(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (current.kind !== "cleanup" || current.phase !== "review") return false;
  const request: LargeBlobGarbageCollectRequest = {
    ...current.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_cleanup(),
  };
  largeBlobsMutation.set({ ...current, phase: "executing" });
  try {
    beginOperation(m.large_blob_cleanup());
    const envelope = await api.garbageCollectLargeBlobs(request);
    const result = largeBlobMutationResult(envelope);
    if (envelope.error) {
      cleanupError("executing", current.previewRequest, current.previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      cleanupError("executing", current.previewRequest, current.previewEnvelope, envelope, null, "missing-result");
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.large_blob_cleanup(), envelope, retryAction(retryLargeBlobMutation));
    } else {
      summarizeOperationFailure(m.large_blob_cleanup(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;
    await refreshAfterMutation();
    return true;
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    cleanupError("executing", current.previewRequest, current.previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.large_blob_cleanup(), runtimeError, retryAction(retryLargeBlobMutation));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

/**
 * Execution failures never repeat the old confirmed request. A retry first
 * refreshes device state, then creates a new dry-run preview and stops at the
 * review phase so the user must confirm again.
 */
export async function retryLargeBlobMutation(): Promise<boolean> {
  const current = get(largeBlobsMutation);
  if (!canRetryLargeBlobMutation(current, get(sessionStatus)) || current.phase !== "error") return false;

  if (current.failedPhase === "previewing") {
    switch (current.kind) {
      case "write":
        return previewLargeBlobWrite();
      case "delete":
        return beginLargeBlobDelete(current.credentialIDHex);
      case "cleanup":
        return beginLargeBlobCleanup();
    }
  }

  if (!current.previewRequest || !current.previewEnvelope) return false;
  switch (current.kind) {
    case "write":
      largeBlobsMutation.set({
        kind: "write",
        phase: "executing",
        credentialIDHex: current.credentialIDHex,
        draft: current.draft,
        previewRequest: current.previewRequest,
        previewEnvelope: current.previewEnvelope,
      });
      break;
    case "delete":
      largeBlobsMutation.set({
        kind: "delete",
        phase: "executing",
        credentialIDHex: current.credentialIDHex,
        previewRequest: current.previewRequest,
        previewEnvelope: current.previewEnvelope,
      });
      break;
    case "cleanup":
      largeBlobsMutation.set({
        kind: "cleanup",
        phase: "executing",
        previewRequest: current.previewRequest,
        previewEnvelope: current.previewEnvelope,
      });
      break;
  }

  const refreshed = await loadLargeBlobs({ refresh: true });
  if (!refreshed) {
    largeBlobsMutation.set(current);
    return false;
  }
  const refreshedReport = largeBlobListReport(get(largeBlobsInventoryState).lastSuccessfulEnvelope);

  switch (current.kind) {
    case "write": {
      const target = findLargeBlobCredential(refreshedReport, current.credentialIDHex);
      if (!target) {
        largeBlobsMutation.set(current);
        return false;
      }
      if (!refreshedReport?.support.largeBlobs
        || target.largeBlobKeyState !== LargeBlobKeyState.LargeBlobKeyAvailable) {
        largeBlobsMutation.set(current);
        return false;
      }
      largeBlobsSelectedCredentialID.set(current.credentialIDHex);
      largeBlobsMutation.set({
        kind: "write",
        phase: "editing",
        credentialIDHex: current.credentialIDHex,
        draft: current.draft,
        validationError: null,
      });
      return previewLargeBlobWrite();
    }
    case "delete": {
      const target = findLargeBlobCredential(refreshedReport, current.credentialIDHex);
      if (!target) {
        largeBlobsMutation.set(current);
        return false;
      }
      if (!refreshedReport?.support.largeBlobs
        || target.largeBlobKeyState !== LargeBlobKeyState.LargeBlobKeyAvailable) {
        largeBlobsMutation.set(current);
        return false;
      }
      return beginLargeBlobDelete(current.credentialIDHex);
    }
    case "cleanup":
      if (!refreshedReport?.support.largeBlobs) {
        largeBlobsMutation.set(current);
        return false;
      }
      return beginLargeBlobCleanup();
  }
}

export function closeLargeBlobMutation() {
  const current = get(largeBlobsMutation);
  if (current.phase === "previewing" || current.phase === "executing") return false;
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
  return true;
}
