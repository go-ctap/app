import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  DecodeMode,
  EntryState,
  ReadState,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import type {
  LargeBlobDecodeEnvelope,
  LargeBlobListEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/telesma/service";

import { api } from "$lib/api";
import {
  completeLargeBlobsInventoryLoad,
  largeBlobsDecodeState,
  largeBlobsReadState,
  largeBlobsSelectedEntryIndex,
  resetLargeBlobsStateForTest,
} from "$lib/features/largeblobs/state";
import { resetAuthenticatorStateForTest } from "$lib/features/authenticator/state";
import { selectLargeBlobEntry, setLargeBlobsDecodeMode } from "$lib/largeblobs-controller";
import { resetWorkbenchStateForTest } from "$lib/features/workbench/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-support/failure";
import { seedSelectionForTest } from "$lib/test-support/store-utils.js";
import { testHIDDevice } from "../test/device";

function listEnvelope(): LargeBlobListEnvelope {
  return {
    operationId: "list-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListLargeBlobs,
    authenticatorClosed: false,
    result: {
      device: testHIDDevice(),
      support: { largeBlobs: true, largeBlobKeyExtension: true },
      array: {
        read: true,
        blobCount: 3,
        matchedBlobCount: 1,
        orphanedBlobCount: 1,
        nonconformingBlobCount: 0,
        corruptBlobCount: 1,
      },
      entries: [
        {
          index: 0,
          state: EntryState.EntryStateMatched,
          target: {
            credentialIDHex: "cafe",
            rp: { id: "example.test" },
            user: { userIDHex: "01" },
          },
          ciphertextByteCount: 32,
          declaredPayloadByteCount: 5,
          payloadByteCount: 5,
        },
        {
          index: 1,
          state: EntryState.EntryStateOrphaned,
          ciphertextByteCount: 24,
          declaredPayloadByteCount: 4,
        },
        {
          index: 2,
          state: EntryState.EntryStateCorrupt,
          target: {
            credentialIDHex: "beef",
            rp: { id: "broken.test" },
            user: { userIDHex: "02" },
          },
          ciphertextByteCount: 40,
          declaredPayloadByteCount: 20,
        },
      ],
    },
  };
}

function readEnvelope(credentialIDHex = "cafe"): LargeBlobReadEnvelope {
  return {
    operationId: "read-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ReadLargeBlob,
    authenticatorClosed: false,
    result: {
      device: testHIDDevice(),
      target: {
        credentialIDHex,
        rp: { id: credentialIDHex === "cafe" ? "example.test" : "broken.test" },
        user: {},
      },
      state: ReadState.ReadStatePresent,
      rawHex: "68656c6c6f",
      rawByteCount: 5,
    },
  };
}

beforeEach(() => {
  setAppLocale("en");
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetLargeBlobsStateForTest();
  seedSelectionForTest("token-1", null, {
    state: "ready",
    selectionId: "authenticator-1",
  });
  completeLargeBlobsInventoryLoad(listEnvelope().result!, "2026-07-30T00:00:00.000Z");
});

afterEach(() => vi.restoreAllMocks());

describe("large blob entry controller", () => {
  it("reads a matched entry and decodes its returned raw bytes separately", async () => {
    const read = vi.spyOn(api, "readLargeBlob").mockResolvedValue(readEnvelope());
    const decode = vi.spyOn(api, "decodeLargeBlob").mockResolvedValue({
      result: { mode: DecodeMode.DecodeModeJSON, value: { hello: true } },
    });

    expect(await selectLargeBlobEntry(0)).toBe(true);

    expect(read).toHaveBeenCalledWith({
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      credentialIDHex: "cafe",
    });
    expect(decode).toHaveBeenCalledWith({
      rawHex: "68656c6c6f",
      mode: DecodeMode.DecodeModeJSON,
    });
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", entryIndex: 0 });
    expect(get(largeBlobsDecodeState)).toMatchObject({ phase: "ready", entryIndex: 0 });
  });

  it("changes interpretation without re-reading the authenticator", async () => {
    const read = vi.spyOn(api, "readLargeBlob").mockResolvedValue(readEnvelope());
    const decode = vi
      .spyOn(api, "decodeLargeBlob")
      .mockResolvedValueOnce({
        result: { mode: DecodeMode.DecodeModeJSON, value: { hello: true } },
      })
      .mockResolvedValueOnce({
        result: { mode: DecodeMode.DecodeModeUTF8, text: "hello" },
      });

    await selectLargeBlobEntry(0);
    expect(await setLargeBlobsDecodeMode(DecodeMode.DecodeModeUTF8)).toBe(true);

    expect(read).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenLastCalledWith({
      rawHex: "68656c6c6f",
      mode: DecodeMode.DecodeModeUTF8,
    });
  });

  it("keeps a successful raw read when decoding fails", async () => {
    const response: LargeBlobDecodeEnvelope = {
      error: failureForCode(Code.CodeLargeBlobUTF8Invalid),
    };

    vi.spyOn(api, "readLargeBlob").mockResolvedValue(readEnvelope());
    vi.spyOn(api, "decodeLargeBlob").mockResolvedValue(response);

    expect(await selectLargeBlobEntry(0)).toBe(true);
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", entryIndex: 0 });
    expect(get(largeBlobsDecodeState)).toMatchObject({
      phase: "error",
      entryIndex: 0,
      responseEnvelope: response,
      runtimeError: null,
    });
  });

  it("opens orphaned entries without attempting credential-backed actions", async () => {
    const read = vi.spyOn(api, "readLargeBlob");
    const decode = vi.spyOn(api, "decodeLargeBlob");

    expect(await selectLargeBlobEntry(1)).toBe(true);

    expect(get(largeBlobsSelectedEntryIndex)).toBe(1);
    expect(get(largeBlobsReadState)).toEqual({ phase: "idle" });
    expect(read).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it("allows a target-bearing corrupt entry to be read", async () => {
    vi.spyOn(api, "readLargeBlob").mockResolvedValue(readEnvelope("beef"));
    vi.spyOn(api, "decodeLargeBlob").mockResolvedValue({
      result: { mode: DecodeMode.DecodeModeJSON, value: {} },
    });

    expect(await selectLargeBlobEntry(2)).toBe(true);
    expect(get(largeBlobsReadState)).toMatchObject({ phase: "ready", entryIndex: 2 });
  });
});
