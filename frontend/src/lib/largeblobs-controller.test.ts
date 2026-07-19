import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  DecodeMode,
  MutationOperation,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/fidobench/service";

import { api } from "./api";
import { failureForCode } from "./test-failure";
import { setAppLocale } from "./i18n";
import {
  beginLargeBlobCleanup,
  beginLargeBlobDelete,
  beginLargeBlobWrite,
  buildLargeBlobReadRequest,
  confirmLargeBlobCleanup,
  confirmLargeBlobDelete,
  confirmLargeBlobWrite,
  previewLargeBlobWrite,
  readLargeBlob,
  selectLargeBlobCredential,
  setLargeBlobsDecodeMode,
  setLargeBlobsPayloadEncoding,
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
  largeBlobsSelectedCredentialID,
  largeBlobsVerificationFlow,
  resetLargeBlobsDeviceState,
  resetLargeBlobsStateForTest,
} from "./features/largeblobs/state";
import { resetAuthenticatorStateForTest, selectedSelector, authenticatorStatus } from "./features/authenticator/state";
import { resetWorkbenchStateForTest, statusBar } from "./features/workbench/state";

function listEnvelope(keyState = "available", blobPresent = false): LargeBlobListEnvelope {
  return {
    operationId: "list-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListLargeBlobs,
    result: {
      device: { fingerprint: "token-1" },
      support: {
        largeBlobs: true,
        largeBlobKeyExtension: true,
        maxSerializedLargeBlobArray: 0,
      },
      array: {
        read: true,
        blobCount: blobPresent ? 1 : 0,
        matchedBlobCount: blobPresent ? 1 : 0,
        unmatchedBlobCount: 0,
      },
      credentials: [{
        credentialIDHex: "cafe",
        rp: { id: "example.test", name: "Example" },
        user: { userIDHex: "01", name: "user" },
        largeBlobKeyState: keyState,
        blobPresent,
        blobState: blobPresent ? "present" : "missing",
        blobByteCount: 0,
      }],
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
    selectionId: "authenticator-1",
    kind,
    result: {
      preview: {
        operation,
        device: { fingerprint: "token-1" },
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
    deviceFingerprint: "token-1",
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

function readEnvelope(mode: DecodeMode): LargeBlobReadEnvelope {
  return {
    operationId: "read-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ReadLargeBlob,
    result: {
      device: { fingerprint: "token-1" },
      support: { largeBlobs: true, largeBlobKeyExtension: true },
      target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
      largeBlobKeyState: "available",
      array: { read: true, blobCount: 1, blobPresent: true, blobState: "present" },
      blobPresent: true,
      rawByteCount: 0,
      decode: { requested: true, mode, success: true },
    },
  } as unknown as LargeBlobReadEnvelope;
}

beforeEach(() => {
  setAppLocale("en");
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetLargeBlobsStateForTest();
  selectedSelector.set("token-1");
  authenticatorStatus.set({
    state: "ready",
    selectionId: "authenticator-1",
  });
  completeLargeBlobsInventoryLoad(listEnvelope(), "2026-07-11T00:00:00.000Z");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("large blob controller", () => {
  it("builds an exact typed read request with the selected decode mode", () => {
    expect(buildLargeBlobReadRequest(
      "authenticator-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      DecodeMode.DecodeModeCBOR,
    )).toEqual({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeCBOR,
    });
  });

  it("reads on selection and decodes again immediately when the mode changes", async () => {
    const initial = readEnvelope(DecodeMode.DecodeModeJSON);
    const decoded = readEnvelope(DecodeMode.DecodeModeCBOR);
    const read = vi.spyOn(api, "readLargeBlob")
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(decoded);

    expect(await selectLargeBlobCredential("cafe")).toBe(true);
    expect(read).toHaveBeenNthCalledWith(1, {
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeJSON,
    });

    expect(await setLargeBlobsDecodeMode(DecodeMode.DecodeModeCBOR)).toBe(true);

    expect(get(largeBlobsDecodeMode)).toBe(DecodeMode.DecodeModeCBOR);
    expect(read).toHaveBeenNthCalledWith(2, {
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeCBOR,
    });
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", responseEnvelope: decoded });
  });

  it("only updates the decode preference when no credential is selected", async () => {
    largeBlobsSelectedCredentialID.set("cafe");
    const read = vi.spyOn(api, "readLargeBlob");
    largeBlobsSelectedCredentialID.set("");

    expect(await setLargeBlobsDecodeMode(DecodeMode.DecodeModeCBOR)).toBe(true);

    expect(get(largeBlobsDecodeMode)).toBe(DecodeMode.DecodeModeCBOR);
    expect(get(largeBlobsReadState)).toEqual({ phase: "idle" });
    expect(read).not.toHaveBeenCalled();
  });

  it("prefills an existing UTF-8 blob when editing starts", () => {
    completeLargeBlobsInventoryLoad(listEnvelope("available", true), "2026-07-11T00:00:00.000Z");
    const envelope = readEnvelope(DecodeMode.DecodeModeUTF8);
    envelope.result!.rawHex = "68656c6c6f";
    envelope.result!.rawByteCount = 5;
    envelope.result!.decode.decodedText = "hello";
    largeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: { selectionId: "authenticator-1", credentialIdHex: "cafe" },
      responseEnvelope: envelope,
    });

    expect(beginLargeBlobWrite("cafe")).toBe(true);
    expect(get(largeBlobsMutation)).toMatchObject({
      kind: "write",
      phase: "editing",
      draft: { payload: "hello", encoding: "utf8" },
    });
  });

  it("prefills existing non-UTF-8 bytes as hex", () => {
    completeLargeBlobsInventoryLoad(listEnvelope("available", true), "2026-07-11T00:00:00.000Z");
    const envelope = readEnvelope(DecodeMode.DecodeModeJSON);
    envelope.result!.rawHex = "fffe";
    envelope.result!.rawByteCount = 2;
    envelope.result!.decode.success = false;
    largeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: { selectionId: "authenticator-1", credentialIdHex: "cafe" },
      responseEnvelope: envelope,
    });

    expect(beginLargeBlobWrite("cafe")).toBe(true);
    expect(get(largeBlobsMutation)).toMatchObject({
      kind: "write",
      phase: "editing",
      draft: { payload: "fffe", encoding: "hex" },
    });
  });

  it("retains a capacity response on error and lets the user edit the draft", async () => {
    const capacity = previewEnvelope(
      OperationKind.WriteLargeBlob,
      MutationOperation.MutationCreate,
      {
        serializedLargeBlobArraySizeAfter: 2049,
        serializedLargeBlobArrayLimit: 0,
      },
    );
    capacity.error = failureForCode(Code.CodeLargeBlobArrayTooLarge);
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

    setLargeBlobsPayloadEncoding("hex");
    expect(get(largeBlobsMutation)).toMatchObject({
      kind: "write",
      phase: "editing",
      credentialIDHex: "cafe",
      draft: { payload: "sensitive payload", encoding: "hex" },
      validationError: null,
    });
  });

  it("reconfirms after any execution failure without rebuilding the delete preview", async () => {
    const preview = previewEnvelope(OperationKind.DeleteLargeBlob, MutationOperation.MutationDelete);
    const executionFailure = previewEnvelope(OperationKind.DeleteLargeBlob, MutationOperation.MutationDelete);
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const remove = vi.spyOn(api, "deleteLargeBlob")
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(resultEnvelope(OperationKind.DeleteLargeBlob, MutationOperation.MutationDelete));
    const list = vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    expect(await beginLargeBlobDelete("cafe")).toBe(true);
    expect(await confirmLargeBlobDelete()).toBe(false);

    expect(await confirmLargeBlobDelete()).toBe(true);
    expect(remove).toHaveBeenCalledTimes(3);
    expect(remove.mock.calls[1][0]).toMatchObject({ dryRun: false });
    expect(remove.mock.calls[2][0]).toMatchObject({ dryRun: false });
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("reconfirms a write after any execution failure", async () => {
    const executionFailure = previewEnvelope(
      OperationKind.WriteLargeBlob,
      MutationOperation.MutationReplace,
    );
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const write = vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(
        OperationKind.WriteLargeBlob,
        MutationOperation.MutationReplace,
      ))
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(resultEnvelope(
        OperationKind.WriteLargeBlob,
        MutationOperation.MutationReplace,
      ));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    expect(beginLargeBlobWrite("cafe")).toBe(true);
    expect(updateLargeBlobWriteDraft({ payload: "updated", encoding: "utf8" })).toBe(true);
    expect(await previewLargeBlobWrite()).toBe(true);
    expect(await confirmLargeBlobWrite()).toBe(false);
    expect(await confirmLargeBlobWrite()).toBe(true);

    expect(write).toHaveBeenCalledTimes(3);
    expect(write.mock.calls[1][0]).toMatchObject({ dryRun: false });
    expect(write.mock.calls[2][0]).toMatchObject({ dryRun: false });
  });

  it("reconfirms cleanup after any execution failure", async () => {
    const executionFailure = previewEnvelope(
      OperationKind.GarbageCollectLargeBlobs,
      MutationOperation.MutationGC,
    );
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const cleanup = vi.spyOn(api, "garbageCollectLargeBlobs")
      .mockResolvedValueOnce(previewEnvelope(
        OperationKind.GarbageCollectLargeBlobs,
        MutationOperation.MutationGC,
      ))
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(resultEnvelope(
        OperationKind.GarbageCollectLargeBlobs,
        MutationOperation.MutationGC,
      ));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    expect(await beginLargeBlobCleanup()).toBe(true);
    expect(await confirmLargeBlobCleanup()).toBe(false);
    expect(await confirmLargeBlobCleanup()).toBe(true);

    expect(cleanup).toHaveBeenCalledTimes(3);
    expect(cleanup.mock.calls[1][0]).toMatchObject({ dryRun: false });
    expect(cleanup.mock.calls[2][0]).toMatchObject({ dryRun: false });
  });

  it("executes the exact previewed write request with dry-run disabled", async () => {
    const write = vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.WriteLargeBlob, MutationOperation.MutationCreate))
      .mockResolvedValueOnce(resultEnvelope(OperationKind.WriteLargeBlob, MutationOperation.MutationCreate));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());

    beginLargeBlobWrite("cafe");
    updateLargeBlobWriteDraft({ payload: "00 ff", encoding: "hex" });
    await previewLargeBlobWrite();
    const previewRequest = write.mock.calls[0][0];
    expect(await confirmLargeBlobWrite()).toBe(true);

    expect(write.mock.calls[1][0]).toEqual({
      ...previewRequest,
      dryRun: false,
    });
  });

  it("keeps mutation success successful when its follow-up forced refresh fails", async () => {
    vi.spyOn(api, "writeLargeBlob")
      .mockResolvedValueOnce(previewEnvelope(OperationKind.WriteLargeBlob, MutationOperation.MutationReplace))
      .mockResolvedValueOnce(resultEnvelope(OperationKind.WriteLargeBlob, MutationOperation.MutationReplace));
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue({
      operationId: "refresh-failed",
      selectionId: "authenticator-1",
      kind: OperationKind.ListLargeBlobs,
      error: failureForCode(Code.CodeTransportFailure),
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
      OperationKind.DeleteLargeBlob,
      MutationOperation.MutationNoBlob,
      { noBlob: true },
    ));
    vi.spyOn(api, "garbageCollectLargeBlobs").mockResolvedValue(previewEnvelope(
      OperationKind.GarbageCollectLargeBlobs,
      MutationOperation.MutationGC,
      { noop: true },
    ));

    expect(await beginLargeBlobDelete("cafe")).toBe(true);
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(statusBar).lastOutcome).toEqual({
      tone: "info",
      title: "Delete large blob",
      message: "This credential has no large blob to delete.",
    });
    expect(await confirmLargeBlobDelete()).toBe(false);

    expect(await beginLargeBlobCleanup()).toBe(true);
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(statusBar).lastOutcome).toEqual({
      tone: "info",
      title: "Large blob cleanup",
      message: "No unmatched large-blob entries need cleanup.",
    });
  });

  it("keeps a missing large-blob key as a normal typed read result", async () => {
    completeLargeBlobsInventoryLoad(listEnvelope("missing"), "2026-07-11T00:00:00.000Z");
    const read = {
      operationId: "read-1",
      selectionId: "authenticator-1",
      kind: OperationKind.ReadLargeBlob,
      result: {
        report: {
          device: { fingerprint: "token-1" },
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
            failure: failureForCode(Code.CodeLargeBlobMissing),
          },
        },
      },
    } as unknown as LargeBlobReadEnvelope;
    const readOperation = vi.spyOn(api, "readLargeBlob").mockResolvedValue(read);

    setLargeBlobsDecodeMode(DecodeMode.DecodeModeCBOR);
    expect(await readLargeBlob("cafe")).toBe(true);
    expect(readOperation).toHaveBeenCalledWith({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeCBOR,
    });
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", responseEnvelope: read });
  });

  it("re-reads an open credential after a successful inventory refresh", async () => {
    const refreshedRead = readEnvelope(DecodeMode.DecodeModeJSON);
    largeBlobsSelectedCredentialID.set("cafe");
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(listEnvelope());
    const read = vi.spyOn(api, "readLargeBlob").mockResolvedValue(refreshedRead);

    const { loadLargeBlobs } = await import("./largeblobs-controller");
    expect(await loadLargeBlobs()).toBe(true);

    expect(read).toHaveBeenCalledWith({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIdHex: "cafe",
      decodeMode: DecodeMode.DecodeModeJSON,
    });
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", responseEnvelope: refreshedRead });
  });

  it("keeps last-known-good inventory action-capable after a forced refresh failure", async () => {
    const failed = {
      operationId: "list-failed",
      selectionId: "authenticator-1",
      kind: OperationKind.ListLargeBlobs,
      error: failureForCode(Code.CodeTransportFailure),
    } as LargeBlobListEnvelope;
    vi.spyOn(api, "listLargeBlobs").mockResolvedValue(failed);
    largeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        selectionId: "authenticator-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: {
        operationId: "old-read",
        selectionId: "authenticator-1",
        kind: OperationKind.ReadLargeBlob,
      } as LargeBlobReadEnvelope,
    });

    const { loadLargeBlobs } = await import("./largeblobs-controller");
    expect(await loadLargeBlobs()).toBe(false);
    expect(get(largeBlobsInventoryState)).toMatchObject({ phase: "error" });
    expect(largeBlobsInventoryIsStale(get(largeBlobsInventoryState))).toBe(true);
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).not.toBeNull();
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", credentialIDHex: "cafe" });
    expect(beginLargeBlobWrite("cafe")).toBe(true);
  });

  it("accepts a typed no-op execution result as successful", async () => {
    const preview = previewEnvelope(OperationKind.DeleteLargeBlob, MutationOperation.MutationDelete);
    const result = resultEnvelope(OperationKind.DeleteLargeBlob, MutationOperation.MutationNoBlob);
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
