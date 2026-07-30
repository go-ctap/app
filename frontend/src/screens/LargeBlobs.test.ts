import { cleanup, render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  DecodeMode,
  EntryState,
  ReadState,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import type { LargeBlobListEnvelope, LargeBlobReadEnvelope } from "../../bindings/telesma/service";

import {
  largeBlobsDecodeMode as mutableLargeBlobsDecodeMode,
  largeBlobsDecodeState as mutableLargeBlobsDecodeState,
  largeBlobsReadState as mutableLargeBlobsReadState,
  largeBlobsSelectedEntryIndex as mutableLargeBlobsSelectedEntryIndex,
} from "$lib/features/largeblobs/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-support/failure";
import {
  resetAppStateForTest,
  seedLargeBlobsEnvelopeForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils";
import { testHIDDevice } from "../test/device";

import LargeBlobs from "./LargeBlobs.svelte";

const controllerMocks = vi.hoisted(() => ({
  reloadLargeBlobs: vi.fn(() => Promise.resolve(true)),
  selectLargeBlobEntry: vi.fn((entryIndex: number | null) => {
    mutableLargeBlobsSelectedEntryIndex.set(entryIndex);

    return Promise.resolve(true);
  }),
  setLargeBlobsDecodeMode: vi.fn((mode: DecodeMode) => {
    mutableLargeBlobsDecodeMode.set(mode);

    return Promise.resolve(true);
  }),
}));

vi.mock("$lib/features/largeblobs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/features/largeblobs")>()),
  reloadLargeBlobs: controllerMocks.reloadLargeBlobs,
  selectLargeBlobEntry: controllerMocks.selectLargeBlobEntry,
  setLargeBlobsDecodeMode: controllerMocks.setLargeBlobsDecodeMode,
}));

function listEnvelope(): LargeBlobListEnvelope {
  return {
    operationId: "list-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListLargeBlobs,
    authenticatorClosed: false,
    result: {
      device: testHIDDevice(),
      support: {
        largeBlobs: true,
        largeBlobKeyExtension: true,
        maxSerializedLargeBlobArray: 2048,
      },
      array: {
        read: true,
        blobCount: 2,
        matchedBlobCount: 1,
        orphanedBlobCount: 1,
        nonconformingBlobCount: 0,
        corruptBlobCount: 0,
      },
      entries: [
        {
          index: 0,
          state: EntryState.EntryStateMatched,
          target: {
            credentialIDHex: "cafe",
            rp: { id: "example.test", name: "Example" },
            user: { userIDHex: "01", name: "alice", displayName: "Alice" },
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
      ],
    },
  };
}

function readEnvelope(): LargeBlobReadEnvelope {
  return {
    operationId: "read-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ReadLargeBlob,
    authenticatorClosed: false,
    result: {
      device: testHIDDevice(),
      target: {
        credentialIDHex: "cafe",
        rp: { id: "example.test" },
        user: {},
      },
      state: ReadState.ReadStatePresent,
      rawHex: "fffe",
      rawByteCount: 2,
    },
  };
}

describe("LargeBlobs physical array inspector", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.reloadLargeBlobs.mockClear();
    controllerMocks.selectLargeBlobEntry.mockClear();
    controllerMocks.setLargeBlobsDecodeMode.mockClear();
    resetAppStateForTest();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedLargeBlobsEnvelopeForTest(listEnvelope());
  });

  afterEach(async () => {
    cleanup();
    await tick();
  });

  it("renders physical entry state and byte counts", () => {
    render(LargeBlobs);

    const table = screen.getByRole("table", { name: "Array entries" });

    expect(within(table).getByRole("columnheader", { name: "Array entry" })).toHaveAttribute(
      "data-slot",
      "expandable-data-table-disclosure-header",
    );
    expect(within(table).getByRole("columnheader", { name: "Ciphertext" })).toHaveAttribute(
      "data-align",
      "end",
    );
    expect(within(table).getByRole("columnheader", { name: "Payload" })).toHaveAttribute(
      "data-align",
      "end",
    );
    expect(within(table).getByText("Entry #0")).toBeInTheDocument();
    expect(within(table).getByText("Entry #1")).toBeInTheDocument();
    expect(within(table).getByText("Matched")).toBeInTheDocument();
    expect(within(table).getByText("Orphaned")).toBeInTheDocument();
    expect(within(table).getByText("32 bytes")).toBeInTheDocument();
  });

  it("opens orphaned entries as inspect-and-cleanup only", async () => {
    const user = userEvent.setup();

    render(LargeBlobs);
    await user.click(screen.getByRole("button", { name: "Entry #1" }));

    expect(controllerMocks.selectLargeBlobEntry).toHaveBeenCalledWith(1);
    expect(
      screen.getAllByText(/can only be inspected or removed by cleanup/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("keeps raw hex visible when interpretation fails", () => {
    mutableLargeBlobsSelectedEntryIndex.set(0);
    mutableLargeBlobsReadState.set({
      phase: "ready",
      entryIndex: 0,
      responseEnvelope: readEnvelope(),
    });
    mutableLargeBlobsDecodeState.set({
      phase: "error",
      entryIndex: 0,
      mode: DecodeMode.DecodeModeUTF8,
      responseEnvelope: {
        error: failureForCode(Code.CodeLargeBlobUTF8Invalid),
      },
      runtimeError: null,
    });

    render(LargeBlobs);

    expect(screen.getByText("Payload interpretation failed")).toBeInTheDocument();
    expect(screen.getByText("The large blob is not valid UTF-8.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Raw hex" })).toHaveTextContent("fffe");
  });

  it("publishes decode-mode changes through the dedicated action", async () => {
    const user = userEvent.setup();

    mutableLargeBlobsSelectedEntryIndex.set(0);
    mutableLargeBlobsReadState.set({
      phase: "ready",
      entryIndex: 0,
      responseEnvelope: readEnvelope(),
    });
    render(LargeBlobs);

    expect(screen.getByRole("region", { name: "Raw hex" })).toHaveTextContent("fffe");
    await user.click(screen.getByRole("radio", { name: "UTF-8 text" }));

    expect(controllerMocks.setLargeBlobsDecodeMode).toHaveBeenCalledWith(DecodeMode.DecodeModeUTF8);
  });
});
