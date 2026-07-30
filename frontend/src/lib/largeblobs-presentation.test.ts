import { describe, expect, it } from "vitest";

import {
  EntryState,
  type ListReport,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";

import {
  buildLargeBlobRows,
  buildLargeBlobsPresentation,
  findLargeBlobEntry,
} from "$lib/largeblobs-presentation";
import { testHIDDevice } from "../test/device";

const report: ListReport = {
  device: testHIDDevice(),
  support: { largeBlobs: true, largeBlobKeyExtension: true },
  array: {
    read: true,
    blobCount: 4,
    matchedBlobCount: 1,
    orphanedBlobCount: 1,
    nonconformingBlobCount: 1,
    corruptBlobCount: 1,
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
    {
      index: 2,
      state: EntryState.EntryStateNonconforming,
      ciphertextByteCount: 7,
      declaredPayloadByteCount: 0,
    },
    {
      index: 3,
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
};

describe("large blob entry presentation", () => {
  it("builds physical rows from generated array entries", () => {
    const rows = buildLargeBlobRows(report);

    expect(rows[0]).toMatchObject({
      credentialIDHex: "cafe",
      ciphertextByteCount: 32,
      payloadByteCount: 5,
    });
    expect(rows[1]).toMatchObject({ hasTarget: false, payloadByteCount: null });
  });

  it("filters and searches generated entry fields", () => {
    expect(buildLargeBlobRows(report, "", "orphaned").map((row) => row.index)).toEqual([1]);
    expect(buildLargeBlobRows(report, "broken").map((row) => row.index)).toEqual([3]);
    expect(buildLargeBlobRows(report, "nonconforming").map((row) => row.index)).toEqual([2]);
    expect(findLargeBlobEntry(report, 3)?.target?.credentialIDHex).toBe("beef");
  });

  it("exposes the four generated summary counts", () => {
    const presentation = buildLargeBlobsPresentation({
      selectedSelector: "token-1",
      selectedDevice: null,
      authenticatorBusy: false,
      authenticatorReady: true,
      inventoryState: {
        phase: "ready",
        report,
        lastSuccessfulAt: "now",
      },
      query: "",
      statusFilter: "all",
      selectedEntryIndex: 0,
    });

    expect(presentation).toMatchObject({
      blobCount: 4,
      matchedBlobCount: 1,
      orphanedBlobCount: 1,
      nonconformingBlobCount: 1,
      corruptBlobCount: 1,
      selectedEntryIndex: 0,
    });
  });
});
