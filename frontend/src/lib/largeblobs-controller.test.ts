import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCategory, OperationKind, VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import {
  DecodeMode,
  MutationOperation,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import { api } from "./api";
import { setAppLocale } from "./i18n";
import {
  beginLargeBlobCleanup,
  beginLargeBlobDelete,
  beginLargeBlobWrite,
  buildLargeBlobReadRequest,
  buildLargeBlobWritePreviewRequest,
  closeLargeBlobMutation,
  confirmLargeBlobCleanup,
  confirmLargeBlobDelete,
  confirmLargeBlobWrite,
  editLargeBlobWrite,
  previewLargeBlobWrite,
  readLargeBlob,
  retryLargeBlobMutation,
  setLargeBlobsDecodeMode,
  updateLargeBlobWriteDraft,
} from "./largeblobs-controller";
import {
  completeLargeBlobsInventoryLoad,
  largeBlobsDecodeMode,
  largeBlobsInventoryState,
  largeBlobsInventoryIsStale,
  largeBlobsMutation,
  largeBlobsPayloadEncoding,
  largeBlobsReadState,
  largeBlobsVerificationFlow,
  resetLargeBlobsDeviceState,
  resetLargeBlobsStateForTest,
} from "./features/largeblobs/state";
import { resetSessionStateForTest, selectedSelector, sessionStatus } from "./features/session/state";
import { resetWorkbenchStateForTest } from "./features/workbench/state";

function listEnvelope(keyState = "available"): LargeBlobListEnvelope {
  return {
    operationId: "list-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListLargeBlobs,
    result: {
      report: {
        device: { deviceId: "token-1", stableId: true },
        support: {
          largeBlobs: true,
          largeBlobKeyExtension: true,
          maxSerializedLargeBlobArray: 0,
        },
        array: {
          read: true,
          blobCount: 1,
          matchedBlobCount: 1,
          unmatchedBlobCount: 0,
        },
        credentials: [{
          credentialIDHex: "cafe",
          rp: { id: "example.test", name: "Example" },
          user: { userIDHex: "01", name: "user" },
          largeBlobKeyState: keyState,
          blobPresent: true,
          blobState: "present",
          blobByteCount: 0,
        }],
      },
    },
  } as unknown as LargeBlobListEnvelope;
}

function previewEnvelope(
  kind: OperationKind,
  operation: MutationOperation,
  patch: Record<string, unknown> = {},
): LargeBlobMutationEnvelope {
  return {
    operationId: `preview-${kind}`,
    sessionId: "session-1",
    kind,
    result: {
      preview: {
        operation,
        device: { deviceId: "token-1", stableId: true },
        support: { largeBlobs: true, largeBlobKeyExtension: true },
        target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
        largeBlobKeyState: "available",
        currentByteCount: 0,
        proposedByteCount: 3,
        serializedLargeBlobArraySizeBefore: 17,
        serializedLargeBlobArraySizeAfter: 20,
        serializedLargeBlobArrayLimit: 1024,
        blobCountBefore: 1,
        blobCountAfter: 1,
        noBlob: false,
        ...patch,
      },
      result: null,
    },
  } as unknown as LargeBlobMutationEnvelope;
}

function resultEnvelope(kind: OperationKind, operation: MutationOperation): LargeBlobMutationEnvelope {
  const envelope = previewEnvelope(kind, operation);
  envelope.operationId = `result-${kind}`;
  envelope.result!.result = {
    operation,
    deviceId: "token-1",
    credentialIDHex: "cafe",
    rpID: "example.test",
    currentByteCount: 0,
    proposedByteCount: 3,
    serializedLargeBlobArraySizeBefore: 17,
    serializedLargeBlobArraySizeAfter: 20,
    blobCountBefore: 1,
    blobCountAfter: 1,
    noBlob: false,
  };
  return envelope;
}

beforeEach(() => {
  setAppLocale("en");
  resetSessionStateForTest();
  resetWorkbenchStateForTest();
  resetLargeBlobsStateForTest();
  selectedSelector.set("token-1");
  sessionStatus.set({
    state: "ready",
    sessionId: "session-1",
  });
  completeLargeBlobsInventoryLoad(listEnvelope(), "2026-07-11T00:00:00.000Z");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("large blob controller", () => {
  it("builds an exact typed read request with the selected decode mode", () => {
    expect(buildLargeBlobReadRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      DecodeMode.DecodeModeCBOR,
    )).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeCBOR,
    });
  });

  it("builds exact base64 write requests and keeps an empty payload explicit", () => {
    expect(buildLargeBlobWritePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      { payload: "Привет", encoding: "utf8" },
    )).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      payload: "0J/RgNC40LLQtdGC",
      dryRun: true,
    });

    expect(buildLargeBlobWritePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowDefault,
      "cafe",
      { payload: "", encoding: "hex" },
    )).toMatchObject({ payload: "", dryRun: true });
  });

  it("retains a capacity response on error without aliasing it as a successful preview", async () => {
    const capacity = previewEnvelope(
      OperationKind.OperationWriteLargeBlob,
      MutationOperation.MutationCreate,
      {
        serializedLargeBlobArraySizeAfter: 2049,
        serializedLargeBlobArrayLimit: 0,
      },
    );
    capacity.error = { category: ErrorCategory.ErrorInvalidState, message: "array too large" };
    vi.spyOn(api, "writeLargeBlob").mockResolvedValue(capacity);

    expect(beginLargeBlobWrite("cafe")).toBe(true);
    updateLargeBlobWriteDraft({ payload: "sensitive payload", encoding: "utf8" });
    expect(await previewLargeBlobWrite()).toBe(false);

    const mutation = get(largeBlobsMutation);
    expect(mutation).toMatchObject({ kind: "write", phase: "error", failedPhase: "previewing" });
    if (mutation.kind !== "write" || mutation.phase !== "error") return;
    expect(mutation.previewEnvelope).toBeNull();
    expect(mutation.responseEnvelope).toBe(capacity);
    expect(mutation.responseEnvelope?.result?.preview.serializedLargeBlobArrayLimit).toBe(0);
    expect(await confirmLargeBlobWrite()).toBe(false);
  });

  it("retries an execution failure through refresh and a new preview without re-executing", async () => {
    const firstPreview = previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace);
    const executionFailure = previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace);
    executionFailure.error = { category: ErrorCategory.ErrorTransportFailure, message: "connection dropped" };
    const secondPreview = previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace);
    const write = vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(firstPreview)
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(secondPreview);
    const list = vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    beginLargeBlobWrite("cafe");
    updateLargeBlobWriteDraft({ payload: "aabb", encoding: "hex" });
    expect(await previewLargeBlobWrite()).toBe(true);
    expect(await confirmLargeBlobWrite()).toBe(false);
    expect(get(largeBlobsMutation)).toMatchObject({ phase: "error", failedPhase: "executing" });

    expect(await retryLargeBlobMutation()).toBe(true);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ refresh: true }));
    expect(write).toHaveBeenCalledTimes(3);
    expect(write.mock.calls[1][0]).toMatchObject({
      payload: "qrs=",
      dryRun: false,
      confirmed: true,
    });
    expect(write.mock.calls[2][0]).toMatchObject({
      payload: "qrs=",
      dryRun: true,
    });
    expect(write.mock.calls[2][0].confirmed).not.toBe(true);
    expect(get(largeBlobsMutation)).toMatchObject({ kind: "write", phase: "review" });
  });

  it("keeps execution retry non-dismissible during forced refresh and restores the error if refresh fails", async () => {
    const executionFailure = previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace);
    executionFailure.error = { category: ErrorCategory.ErrorTransportFailure, message: "connection dropped" };
    vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace))
      .mockResolvedValueOnce(executionFailure);

    let resolveRefresh!: (value: LargeBlobListEnvelope) => void;
    const refreshResponse = new Promise<LargeBlobListEnvelope>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.spyOn(api, "listLargeBlobs").mockReturnValue(refreshResponse);

    beginLargeBlobWrite("cafe");
    updateLargeBlobWriteDraft({ payload: "retry me", encoding: "utf8" });
    await previewLargeBlobWrite();
    await confirmLargeBlobWrite();
    const originalError = get(largeBlobsMutation);
    expect(originalError).toMatchObject({ kind: "write", phase: "error", failedPhase: "executing" });

    const retry = retryLargeBlobMutation();
    expect(get(largeBlobsMutation)).toMatchObject({ kind: "write", phase: "executing" });
    expect(closeLargeBlobMutation()).toBe(false);
    expect(editLargeBlobWrite()).toBe(false);

    resolveRefresh({
      operationId: "refresh-failed",
      sessionId: "session-1",
      kind: OperationKind.OperationListLargeBlobs,
      error: { category: ErrorCategory.ErrorTransportFailure, message: "still offline" },
    } as LargeBlobListEnvelope);
    expect(await retry).toBe(false);
    expect(get(largeBlobsMutation)).toEqual(originalError);
  });

  it("restores the execution error when refreshed credentials lose their large-blob key", async () => {
    const executionFailure = previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace);
    executionFailure.error = { category: ErrorCategory.ErrorTransportFailure, message: "connection dropped" };
    const write = vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace))
      .mockResolvedValueOnce(executionFailure);
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope("missing"));

    beginLargeBlobWrite("cafe");
    await previewLargeBlobWrite();
    await confirmLargeBlobWrite();
    const originalError = get(largeBlobsMutation);

    expect(await retryLargeBlobMutation()).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    expect(get(largeBlobsMutation)).toEqual(originalError);
  });

  it("restores the cleanup execution error when refreshed support disappears", async () => {
    const executionFailure = previewEnvelope(
      OperationKind.OperationGarbageCollectLargeBlobs,
      MutationOperation.MutationGC,
    );
    executionFailure.error = { category: ErrorCategory.ErrorTransportFailure, message: "connection dropped" };
    const cleanup = vi.spyOn(api, "garbageCollectLargeBlobs")
      .mockResolvedValueOnce(previewEnvelope(
        OperationKind.OperationGarbageCollectLargeBlobs,
        MutationOperation.MutationGC,
      ))
      .mockResolvedValueOnce(executionFailure);
    const unsupported = listEnvelope();
    unsupported.result!.report.support.largeBlobs = false;
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(unsupported);

    await beginLargeBlobCleanup();
    await confirmLargeBlobCleanup();
    const originalError = get(largeBlobsMutation);

    expect(await retryLargeBlobMutation()).toBe(false);
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(get(largeBlobsMutation)).toEqual(originalError);
  });

  it("executes the exact previewed write request with only confirmation fields changed", async () => {
    const write = vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationCreate))
      .mockResolvedValueOnce(resultEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationCreate));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    beginLargeBlobWrite("cafe");
    updateLargeBlobWriteDraft({ payload: "00 ff", encoding: "hex" });
    await previewLargeBlobWrite();
    const previewRequest = write.mock.calls[0][0];
    expect(await confirmLargeBlobWrite()).toBe(true);

    expect(write.mock.calls[1][0]).toEqual({
      ...previewRequest,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Confirm write",
    });
  });

  it("keeps mutation success successful when its follow-up forced refresh fails", async () => {
    vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace))
      .mockResolvedValueOnce(resultEnvelope(OperationKind.OperationWriteLargeBlob, MutationOperation.MutationReplace));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue({
      operationId: "refresh-failed",
      sessionId: "session-1",
      kind: OperationKind.OperationListLargeBlobs,
      error: { category: ErrorCategory.ErrorTransportFailure, message: "offline after write" },
    } as LargeBlobListEnvelope);

    beginLargeBlobWrite("cafe");
    updateLargeBlobWriteDraft({ payload: "new value", encoding: "utf8" });
    await previewLargeBlobWrite();

    expect(await confirmLargeBlobWrite()).toBe(true);
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(largeBlobsReadState)).toEqual({ phase: "idle" });
    expect(get(largeBlobsInventoryState)).toMatchObject({ phase: "error" });
    expect(largeBlobsInventoryIsStale(get(largeBlobsInventoryState))).toBe(true);
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).not.toBeNull();
  });

  it("treats delete and cleanup no-op previews as informational without confirmation", async () => {
    vi.spyOn(api, "deleteLargeBlob").mockResolvedValue(previewEnvelope(
      OperationKind.OperationDeleteLargeBlob,
      MutationOperation.MutationNoBlob,
      { noBlob: true },
    ));
    vi.spyOn(api, "garbageCollectLargeBlobs").mockResolvedValue(previewEnvelope(
      OperationKind.OperationGarbageCollectLargeBlobs,
      MutationOperation.MutationGC,
      { noop: true },
    ));

    expect(await beginLargeBlobDelete("cafe")).toBe(true);
    expect(get(largeBlobsMutation)).toMatchObject({ kind: "delete", phase: "noop" });
    expect(await confirmLargeBlobDelete()).toBe(false);

    expect(await beginLargeBlobCleanup()).toBe(true);
    expect(get(largeBlobsMutation)).toMatchObject({ kind: "cleanup", phase: "noop" });
  });

  it("keeps a missing large-blob key as a normal typed read result", async () => {
    completeLargeBlobsInventoryLoad(listEnvelope("missing"), "2026-07-11T00:00:00.000Z");
    const read = {
      operationId: "read-1",
      sessionId: "session-1",
      kind: OperationKind.OperationReadLargeBlob,
      result: {
        report: {
          device: { deviceId: "token-1", stableId: true },
          support: { largeBlobs: true, largeBlobKeyExtension: true },
          target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
          largeBlobKeyState: "missing",
          array: { read: false, blobCount: 0, blobPresent: false, blobState: "unknown_key_missing" },
          blobPresent: false,
          rawByteCount: 0,
          decode: {
            requested: true,
            mode: DecodeMode.DecodeModeCBOR,
            success: false,
            failure: "no blob present",
          },
        },
      },
    } as unknown as LargeBlobReadEnvelope;
    const readOperation = vi.spyOn(api, "readLargeBlob").mockResolvedValue(read);

    setLargeBlobsDecodeMode(DecodeMode.DecodeModeCBOR);
    expect(await readLargeBlob("cafe")).toBe(true);
    expect(readOperation).toHaveBeenCalledWith({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeCBOR,
    });
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", responseEnvelope: read });
  });

  it("keeps last-known-good inventory stale and blocks reads after a forced refresh failure", async () => {
    const failed = {
      operationId: "list-failed",
      sessionId: "session-1",
      kind: OperationKind.OperationListLargeBlobs,
      error: { category: ErrorCategory.ErrorTransportFailure, message: "offline" },
    } as LargeBlobListEnvelope;
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(failed);
    largeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: {
        operationId: "old-read",
        sessionId: "session-1",
        kind: OperationKind.OperationReadLargeBlob,
      } as LargeBlobReadEnvelope,
    });

    const { loadLargeBlobs } = await import("./largeblobs-controller");
    expect(await loadLargeBlobs({ refresh: true })).toBe(false);
    expect(get(largeBlobsInventoryState)).toMatchObject({ phase: "error" });
    expect(largeBlobsInventoryIsStale(get(largeBlobsInventoryState))).toBe(true);
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).not.toBeNull();
    expect(get(largeBlobsReadState)).toEqual({ phase: "idle" });
    expect(await readLargeBlob("cafe")).toBe(false);
  });

  it("accepts a typed no-op execution result as successful", async () => {
    const preview = previewEnvelope(OperationKind.OperationDeleteLargeBlob, MutationOperation.MutationDelete);
    const result = resultEnvelope(OperationKind.OperationDeleteLargeBlob, MutationOperation.MutationNoBlob);
    result.result!.result!.noBlob = true;
    vi.spyOn(api, "deleteLargeBlob")
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(result);
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    await beginLargeBlobDelete("cafe");
    expect(await confirmLargeBlobDelete()).toBe(true);
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
  });

  it("resets device-owned state while preserving verification and encoding preferences", () => {
    largeBlobsVerificationFlow.set(VerificationFlow.VerificationFlowPIN);
    largeBlobsPayloadEncoding.set("hex");
    largeBlobsDecodeMode.set(DecodeMode.DecodeModeCBOR);
    beginLargeBlobWrite("cafe");

    resetLargeBlobsDeviceState();

    expect(get(largeBlobsInventoryState).phase).toBe("idle");
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(largeBlobsVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(get(largeBlobsPayloadEncoding)).toBe("hex");
    expect(get(largeBlobsDecodeMode)).toBe(DecodeMode.DecodeModeCBOR);
  });
});
