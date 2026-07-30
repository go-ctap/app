import { get } from "svelte/store";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import {
  DecodeMode,
  MutationOperation,
  ReadState,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobDecodeEnvelope,
  LargeBlobDecodeRequest,
  LargeBlobGarbageCollectRequest,
  LargeBlobMutationEnvelope,
  LargeBlobMutationRequest,
  LargeBlobReadEnvelope,
  LargeBlobReadRequest,
  OperationRequest,
} from "../../bindings/telesma/service";
import { m } from "../paraglide/messages.js";
import { api } from "$lib/api.js";
import {
  largeBlobDecodeResult,
  largeBlobListReport,
  largeBlobMutationPreview,
  largeBlobMutationResult,
  largeBlobReadReport,
} from "$lib/ctapkit-results.js";
import {
  beginLargeBlobsInventoryLoad,
  completeLargeBlobsInventoryLoad,
  failLargeBlobsInventoryLoadAtRuntime,
  failLargeBlobsInventoryLoadWithResponse,
  largeBlobsDecodeState,
  largeBlobsDecodeMode,
  largeBlobsInventoryState,
  largeBlobsMutation,
  largeBlobsPayloadEncoding,
  largeBlobsQuery,
  largeBlobsReadState,
  largeBlobsSelectedEntryIndex,
  largeBlobsStatusFilter,
  largeBlobsVerificationFlow,
  resetLargeBlobReadState,
  resetLargeBlobsDeviceState,
  type LargeBlobMutationState,
  type LargeBlobWriteDraft,
  type LargeBlobsStatusFilter,
} from "$lib/features/largeblobs/state.js";
import { selectedSelector, authenticatorStatus } from "$lib/features/authenticator/state.js";
import { activeScreen } from "$lib/features/workbench/state.js";
import {
  parseLargeBlobPayload,
  type LargeBlobPayloadEncoding,
  type LargeBlobPayloadValidationError,
} from "$lib/largeblobs-payload.js";
import { findLargeBlobEntry } from "$lib/largeblobs-presentation.js";
import { runtimeFailureFrom } from "$lib/failure.js";
import { currentSelectionID } from "$lib/authenticator-boundary.js";
import {
  editingConfirmedOperation,
  idleConfirmedOperation,
  runConfirmedExecution,
  runConfirmedPreview,
  type ConfirmedOperationError,
  type ConfirmedOperationExecuting,
  type ConfirmedOperationReview,
} from "$lib/confirmed-operation.js";
import {
  completeOperation,
  requestForCurrentSelection,
  runOperation,
} from "$lib/operation-lifecycle.js";
import { setStatusOutcome } from "$lib/workbench-state.js";

function largeBlobsAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const selectionId = get(authenticatorStatus).selectionId || "";

  return selector && selectionId ? `${selector}:${selectionId}` : "";
}

function shouldAutoLoadLargeBlobs() {
  const inventory = get(largeBlobsInventoryState);

  return (
    get(activeScreen) === "large-blobs" &&
    Boolean(largeBlobsAutoLoadKey()) &&
    !inventory.report &&
    inventory.phase !== "loading" &&
    inventory.phase !== "refreshing" &&
    inventory.phase !== "unsupported"
  );
}

function reconcileSelectedEntry() {
  const selectedIndex = get(largeBlobsSelectedEntryIndex);

  if (selectedIndex === null) return;

  const report = get(largeBlobsInventoryState).report;

  if (findLargeBlobEntry(report, selectedIndex)) return;

  largeBlobsSelectedEntryIndex.set(null);
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
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
  const request: OperationRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(largeBlobsVerificationFlow),
  };
  const attempt = await runOperation({
    label,
    call: () => api.listLargeBlobs(requestForCurrentSelection(request)),
    onRuntimeFailure: failLargeBlobsInventoryLoadAtRuntime,
  });

  if (!attempt.ok) return false;

  const envelope = attempt.envelope;

  if (envelope.error) {
    failLargeBlobsInventoryLoadWithResponse(envelope);
  } else {
    completeLargeBlobsInventoryLoad(largeBlobListReport(envelope)!, new Date().toISOString());
    resetLargeBlobReadState();
    reconcileSelectedEntry();
  }

  completeOperation(label, envelope);

  const selectedEntryIndex = get(largeBlobsSelectedEntryIndex);

  if (!envelope.error && selectedEntryIndex !== null) {
    await readLargeBlob(selectedEntryIndex);
  }

  return !envelope.error;
}

export function setLargeBlobsQuery(value: string) {
  largeBlobsQuery.set(value);
}

export function setLargeBlobsStatusFilter(value: LargeBlobsStatusFilter) {
  largeBlobsStatusFilter.set(value);
}

export async function selectLargeBlobEntry(entryIndex: number | null): Promise<boolean> {
  if (get(largeBlobsSelectedEntryIndex) === entryIndex) return true;

  largeBlobsSelectedEntryIndex.set(entryIndex);
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
  if (entryIndex === null) return true;

  const entry = findLargeBlobEntry(reportForActions(), entryIndex);

  return entryHasTarget(entry) ? readLargeBlob(entryIndex) : true;
}

export function setLargeBlobsVerificationFlow(value: VerificationFlow) {
  largeBlobsVerificationFlow.set(value);
}

export async function setLargeBlobsDecodeMode(value: DecodeMode): Promise<boolean> {
  largeBlobsDecodeMode.set(value);
  const readState = get(largeBlobsReadState);

  if (readState.phase !== "ready") {
    largeBlobsDecodeState.set({ phase: "idle" });

    return true;
  }

  const report = largeBlobReadReport(readState.responseEnvelope);

  if (report?.state !== ReadState.ReadStatePresent) {
    largeBlobsDecodeState.set({ phase: "idle" });

    return true;
  }

  return decodeLargeBlob(readState.entryIndex, report.rawHex ?? "", value);
}

export function setLargeBlobsPayloadEncoding(value: LargeBlobPayloadEncoding) {
  largeBlobsPayloadEncoding.set(value);

  const current = get(largeBlobsMutation);

  if (current.kind !== "write") return;

  largeBlobsMutation.set(
    editingLargeBlobWrite(
      {
        ...writeMutationBase(current),
        draft: { ...current.draft, encoding: value },
      },
      null,
    ),
  );
}

function reportForActions() {
  const inventory = get(largeBlobsInventoryState);

  if (inventory.phase === "loading" || inventory.phase === "refreshing") return null;

  const authenticator = get(authenticatorStatus);

  if (authenticator.state !== "ready" || !authenticator.selectionId) return null;

  const report = inventory.report;

  return report?.support.largeBlobs ? report : null;
}

function entryHasTarget(entry: ReturnType<typeof findLargeBlobEntry>): entry is NonNullable<
  ReturnType<typeof findLargeBlobEntry>
> & {
  target: NonNullable<NonNullable<ReturnType<typeof findLargeBlobEntry>>["target"]>;
} {
  return Boolean(entry?.target);
}

function entryForMutation(entryIndex: number) {
  const entry = findLargeBlobEntry(reportForActions(), entryIndex);

  return entryHasTarget(entry) ? entry : null;
}

function writeMutationBase(current: Extract<LargeBlobMutationState, { kind: "write" }>) {
  return {
    kind: "write" as const,
    entryIndex: current.entryIndex,
    credentialIDHex: current.credentialIDHex,
    draft: current.draft,
  };
}

function deleteMutationBase(entryIndex: number, credentialIDHex: string) {
  return { kind: "delete" as const, entryIndex, credentialIDHex };
}

function cleanupMutationBase() {
  return { kind: "cleanup" as const };
}

function editingLargeBlobWrite(
  base: ReturnType<typeof writeMutationBase>,
  validationError: LargeBlobPayloadValidationError | null,
) {
  return {
    ...base,
    operation: editingConfirmedOperation(validationError),
  };
}

function readError(
  entryIndex: number,
  responseEnvelope: LargeBlobReadEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
) {
  largeBlobsReadState.set({
    phase: "error",
    entryIndex,
    responseEnvelope,
    runtimeError,
  });
}

function decodeError(
  entryIndex: number,
  mode: DecodeMode,
  responseEnvelope: LargeBlobDecodeEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
) {
  largeBlobsDecodeState.set({
    phase: "error",
    entryIndex,
    mode,
    responseEnvelope,
    runtimeError,
  });
}

async function decodeLargeBlob(
  entryIndex: number,
  rawHex: string,
  mode = get(largeBlobsDecodeMode),
): Promise<boolean> {
  const request: LargeBlobDecodeRequest = { rawHex, mode };

  largeBlobsDecodeState.set({ phase: "loading", entryIndex, mode });

  try {
    const envelope = await api.decodeLargeBlob(request);

    if (envelope.error) {
      decodeError(entryIndex, mode, envelope, null);

      return false;
    }

    largeBlobsDecodeState.set({
      phase: "ready",
      entryIndex,
      mode,
      responseEnvelope: envelope,
      value: largeBlobDecodeResult(envelope)!,
    });

    return true;
  } catch (cause) {
    decodeError(entryIndex, mode, null, runtimeFailureFrom(cause));

    return false;
  }
}

export async function readLargeBlob(
  entryIndex = get(largeBlobsSelectedEntryIndex),
): Promise<boolean> {
  const inventory = reportForActions();
  if (entryIndex === null) return false;

  const entry = findLargeBlobEntry(inventory, entryIndex);
  if (!entryHasTarget(entry)) return false;

  const request: LargeBlobReadRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(largeBlobsVerificationFlow),
    credentialIdHex: entry.target.credentialIDHex,
  };

  largeBlobsSelectedEntryIndex.set(entryIndex);
  resetLargeBlobReadState();
  largeBlobsReadState.set({ phase: "loading", entryIndex });

  const label = m.large_blob_read();
  const attempt = await runOperation({
    label,
    call: () => api.readLargeBlob(requestForCurrentSelection(request)),
    onRuntimeFailure: (error) => readError(entryIndex, null, error),
  });

  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  if (envelope.error) {
    readError(entryIndex, envelope, null);
  } else {
    largeBlobsReadState.set({ phase: "ready", entryIndex, responseEnvelope: envelope });
  }

  completeOperation(label, envelope);

  if (envelope.error) return false;

  const report = largeBlobReadReport(envelope)!;

  if (report.state === ReadState.ReadStatePresent) {
    await decodeLargeBlob(entryIndex, report.rawHex ?? "");
  }

  return true;
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

export function beginLargeBlobWrite(entryIndex = get(largeBlobsSelectedEntryIndex)) {
  if (entryIndex === null) return false;

  const entry = entryForMutation(entryIndex);
  if (!entry) return false;

  const readState = get(largeBlobsReadState);

  if (readState.phase !== "ready" || readState.entryIndex !== entryIndex) return false;

  const report = largeBlobReadReport(readState.responseEnvelope);

  if (!report || report.state !== ReadState.ReadStatePresent) return false;

  let draft: LargeBlobWriteDraft = { payload: report.rawHex ?? "", encoding: "hex" };
  const decodeState = get(largeBlobsDecodeState);

  if (
    decodeState.phase === "ready" &&
    decodeState.entryIndex === entryIndex &&
    decodeState.mode === DecodeMode.DecodeModeUTF8
  ) {
    draft = { payload: decodeState.value.text ?? "", encoding: "utf8" };
  }

  largeBlobsSelectedEntryIndex.set(entryIndex);
  largeBlobsMutation.set(
    editingLargeBlobWrite(
      {
        kind: "write" as const,
        entryIndex,
        credentialIDHex: entry.target.credentialIDHex,
        draft,
      },
      null,
    ),
  );

  return true;
}

export function updateLargeBlobWriteDraft(patch: Partial<LargeBlobWriteDraft>) {
  const current = get(largeBlobsMutation);

  if (current.kind !== "write") return false;

  const draft = { ...current.draft, ...patch };

  largeBlobsPayloadEncoding.set(draft.encoding);
  largeBlobsMutation.set(
    editingLargeBlobWrite(
      {
        ...writeMutationBase(current),
        draft,
      },
      null,
    ),
  );

  return true;
}

export function editLargeBlobWrite() {
  const current = get(largeBlobsMutation);

  if (
    current.kind !== "write" ||
    (current.operation.phase !== "review" && current.operation.phase !== "error")
  )
    return false;

  largeBlobsMutation.set(editingLargeBlobWrite(writeMutationBase(current), null));

  return true;
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);

  if (
    current.kind !== "write" ||
    (current.operation.phase !== "editing" && current.operation.phase !== "error")
  )
    return false;

  if (!entryForMutation(current.entryIndex)) return false;

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

  const base = writeMutationBase(current);

  return runConfirmedPreview({
    label: m.large_blob_write(),
    request,
    call: api.writeLargeBlob,
    extract: largeBlobMutationPreview,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
  });
}

export async function beginLargeBlobDelete(
  entryIndex = get(largeBlobsSelectedEntryIndex),
): Promise<boolean> {
  if (entryIndex === null) return false;

  const entry = entryForMutation(entryIndex);
  if (!entry) return false;

  const credentialIDHex = entry.target.credentialIDHex;

  const request = buildLargeBlobDeletePreviewRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
    credentialIDHex,
  );

  largeBlobsSelectedEntryIndex.set(entryIndex);

  const base = deleteMutationBase(entryIndex, credentialIDHex);

  return runConfirmedPreview({
    label: m.large_blob_delete(),
    request,
    call: api.deleteLargeBlob,
    extract: largeBlobMutationPreview,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
    shouldReview: (preview) =>
      !(
        preview.operation === MutationOperation.MutationNoBlob ||
        preview.noBlob ||
        preview.noop === true
      ),
    onSkipped: () => {
      largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
      setStatusOutcome({
        tone: "info",
        title: m.large_blob_delete(),
        message: m.large_blob_delete_noop(),
      });
    },
  });
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!reportForActions()) return false;

  const request = buildLargeBlobCleanupPreviewRequest(
    currentSelectionID(),
    get(largeBlobsVerificationFlow),
  );

  const base = cleanupMutationBase();

  return runConfirmedPreview({
    label: m.large_blob_cleanup_preview(),
    request,
    call: api.garbageCollectLargeBlobs,
    extract: largeBlobMutationPreview,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
    shouldReview: (preview) => preview.noop !== true,
    onSkipped: () => {
      largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
      setStatusOutcome({
        tone: "info",
        title: m.large_blob_cleanup(),
        message: m.large_blob_cleanup_noop(),
      });
    },
  });
}

async function refreshAfterMutation() {
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
  largeBlobsSelectedEntryIndex.set(null);
  resetLargeBlobReadState();
  await loadLargeBlobs();
}

type LargeBlobExecutionRequest = LargeBlobMutationRequest | LargeBlobGarbageCollectRequest;

type LargeBlobExecutionOptions<TRequest extends LargeBlobExecutionRequest> = {
  label: string;
  operation:
    | ConfirmedOperationReview<TRequest, LargeBlobMutationEnvelope>
    | ConfirmedOperationError<TRequest, LargeBlobMutationEnvelope>;
  call: (request: TRequest) => Promise<LargeBlobMutationEnvelope>;
  publish: (
    operation:
      | ConfirmedOperationExecuting<TRequest, LargeBlobMutationEnvelope>
      | ConfirmedOperationError<TRequest, LargeBlobMutationEnvelope>,
  ) => void;
};

async function executeReviewedLargeBlobMutation<TRequest extends LargeBlobExecutionRequest>({
  label,
  operation,
  call,
  publish,
}: LargeBlobExecutionOptions<TRequest>): Promise<boolean> {
  const succeeded = await runConfirmedExecution({
    label,
    operation,
    call,
    extract: largeBlobMutationResult,
    publish,
  });

  if (!succeeded) return false;

  await refreshAfterMutation();

  return true;
}

export async function confirmLargeBlobWrite(): Promise<boolean> {
  const current = get(largeBlobsMutation);

  if (
    current.kind !== "write" ||
    (current.operation.phase !== "review" && current.operation.phase !== "error")
  )
    return false;

  const base = writeMutationBase(current);

  return executeReviewedLargeBlobMutation({
    label: m.large_blob_write(),
    operation: current.operation,
    call: api.writeLargeBlob,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
  });
}

export async function confirmLargeBlobDelete(): Promise<boolean> {
  const current = get(largeBlobsMutation);

  if (
    current.kind !== "delete" ||
    (current.operation.phase !== "review" && current.operation.phase !== "error")
  )
    return false;

  const base = deleteMutationBase(current.entryIndex, current.credentialIDHex);

  return executeReviewedLargeBlobMutation({
    label: m.large_blob_delete(),
    operation: current.operation,
    call: api.deleteLargeBlob,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
  });
}

export async function confirmLargeBlobCleanup(): Promise<boolean> {
  const current = get(largeBlobsMutation);

  if (
    current.kind !== "cleanup" ||
    (current.operation.phase !== "review" && current.operation.phase !== "error")
  )
    return false;

  const base = cleanupMutationBase();

  return executeReviewedLargeBlobMutation({
    label: m.large_blob_cleanup(),
    operation: current.operation,
    call: api.garbageCollectLargeBlobs,
    publish: (operation) => largeBlobsMutation.set({ ...base, operation }),
  });
}

export function closeLargeBlobMutation() {
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
}
