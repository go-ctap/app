import { beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { LargeBlobListEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { setAppLocale } from "./i18n";
import {
  emptyLargeBlobsInventoryState,
  type LargeBlobsInventoryState,
} from "./features/largeblobs/state";
import {
  buildLargeBlobRows,
  buildLargeBlobsPresentation,
} from "./largeblobs-presentation";

function envelope(): LargeBlobListEnvelope {
  return {
    operationId: "list-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListLargeBlobs,
    result: {
      report: {
        device: { deviceId: "token-1", stableId: true, product: "Test key" },
        support: {
          largeBlobs: true,
          largeBlobKeyExtension: true,
          maxSerializedLargeBlobArray: 0,
        },
        array: {
          read: true,
          blobCount: 2,
          matchedBlobCount: 2,
          unmatchedBlobCount: 0,
        },
        credentials: [
          {
            credentialIDHex: "zero",
            rp: { id: "example.test", name: "Example", idHashHex: "aa" },
            user: { userIDHex: "01", name: "zero@example.test", displayName: "Zero Blob" },
            largeBlobKeyState: "available",
            blobPresent: true,
            blobState: "present",
            blobByteCount: 0,
          },
          {
            credentialIDHex: "missing",
            rp: { id: "missing.test" },
            user: { name: "missing" },
            largeBlobKeyState: "available",
            blobPresent: false,
            blobState: "missing",
            blobByteCount: 0,
          },
          {
            credentialIDHex: "no-key",
            rp: { id: "unknown.test" },
            user: {},
            largeBlobKeyState: "missing",
            blobPresent: false,
            blobState: "unknown_key_missing",
            blobByteCount: 0,
          },
        ],
      },
    },
  } as unknown as LargeBlobListEnvelope;
}

function state(value: LargeBlobListEnvelope): LargeBlobsInventoryState {
  return {
    ...emptyLargeBlobsInventoryState(),
    phase: "ready",
    lastSuccessfulEnvelope: value,
    responseEnvelope: value,
    lastSuccessfulAt: "2026-07-11T00:00:00.000Z",
  };
}

beforeEach(() => {
  setAppLocale("en");
});

describe("large blob presentation", () => {
  it("treats an explicit zero-byte blob as present and preserves a zero capacity", () => {
    const presentation = buildLargeBlobsPresentation({
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: state(envelope()),
      selectedCredentialID: "zero",
    });

    expect(presentation.selectedRow).toMatchObject({ blobPresent: true, blobByteCount: 0 });
    expect(presentation.maxSerializedLargeBlobArray).toBe(0);
    expect(presentation.blobCount).toBe(2);
    expect(presentation.readDisabled).toBe(false);
    expect(presentation.writeDisabled).toBe(false);
  });

  it("searches generated RP/user identity and implements every blob filter", () => {
    const report = envelope().result!.report;
    for (const query of ["example", "example.test", "aa", "zero", "01", "zero@example", "zero blob"]) {
      expect(buildLargeBlobRows(report, query).map((row) => row.id), query).toEqual(["zero"]);
    }

    expect(buildLargeBlobRows(report, "", "present").map((row) => row.id)).toEqual(["zero"]);
    expect(buildLargeBlobRows(report, "", "missing").map((row) => row.id)).toEqual(["missing"]);
    expect(buildLargeBlobRows(report, "", "key-unavailable").map((row) => row.id)).toEqual(["no-key"]);
  });

  it("allows typed reads for missing keys while blocking unsupported mutations", () => {
    const presentation = buildLargeBlobsPresentation({
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: state(envelope()),
      selectedCredentialID: "no-key",
    });

    expect(presentation.readDisabled).toBe(false);
    expect(presentation.writeDisabled).toBe(true);
    expect(presentation.deleteDisabled).toBe(true);
  });

  it("keeps last-known-good rows visible but blocks every action when stale", () => {
    const successful = envelope();
    const stale: LargeBlobsInventoryState = {
      ...state(successful),
      phase: "error",
      responseEnvelope: {
        operationId: "failed-list",
        sessionId: "session-1",
        kind: OperationKind.OperationListLargeBlobs,
        error: { category: "transport-failure", message: "offline" },
      } as LargeBlobListEnvelope,
      stale: true,
    };
    const presentation = buildLargeBlobsPresentation({
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: stale,
      selectedCredentialID: "zero",
    });

    expect(presentation.rows).toHaveLength(3);
    expect(presentation.stale).toBe(true);
    expect(presentation.readDisabled).toBe(true);
    expect(presentation.writeDisabled).toBe(true);
    expect(presentation.deleteDisabled).toBe(true);
    expect(presentation.cleanupDisabled).toBe(true);
  });
});
