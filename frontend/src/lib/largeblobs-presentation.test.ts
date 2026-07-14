import { beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { BlobState, LargeBlobKeyState } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { Vendor } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { LargeBlobListEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "./i18n";
import { failureForCode } from "./test-failure";
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
        device: {
          fingerprint: "token-1",
          transport: Mode.ModeHID,
          path: "token-1",
          vendorId: 1,
          productId: 2,
          vendor: Vendor.VendorUnknown,
          product: "Test key",
        },
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
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyAvailable,
            blobPresent: true,
            blobState: BlobState.BlobStatePresent,
            blobByteCount: 0,
          },
          {
            credentialIDHex: "missing",
            rp: { id: "missing.test" },
            user: { name: "missing" },
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyAvailable,
            blobPresent: false,
            blobState: BlobState.BlobStateMissing,
            blobByteCount: 0,
          },
          {
            credentialIDHex: "no-key",
            rp: { id: "unknown.test" },
            user: {},
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyMissing,
            blobPresent: false,
            blobState: BlobState.BlobStateUnknownKeyMissing,
            blobByteCount: 0,
          },
        ],
      },
    },
  };
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

const defaultView = {
  query: "",
  statusFilter: "all" as const,
  selectedCredentialID: "",
};

beforeEach(() => {
  setAppLocale("en");
});

describe("large blob presentation", () => {
  it("treats an explicit zero-byte blob as present and preserves a zero capacity", () => {
    const presentation = buildLargeBlobsPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: state(envelope()),
      selectedCredentialID: "zero",
    });

    expect(presentation.rows.find((row) => row.id === "zero")).toMatchObject({ blobPresent: true, blobByteCount: 0 });
    expect(presentation.maxSerializedLargeBlobArray).toBe(0);
    expect(presentation.blobCount).toBe(2);
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

  it("blocks mutations for credentials with missing large-blob keys", () => {
    const presentation = buildLargeBlobsPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: state(envelope()),
      selectedCredentialID: "no-key",
    });

    expect(presentation.writeDisabled).toBe(true);
    expect(presentation.deleteDisabled).toBe(true);
  });

  it("blocks deletion when the selected credential has no blob", () => {
    const presentation = buildLargeBlobsPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: state(envelope()),
      selectedCredentialID: "missing",
    });

    expect(presentation.writeDisabled).toBe(false);
    expect(presentation.deleteDisabled).toBe(true);
  });

  it("keeps last-known-good rows and their actions available when stale", () => {
    const successful = envelope();
    const stale: LargeBlobsInventoryState = {
      ...state(successful),
      phase: "error",
      responseEnvelope: {
        operationId: "failed-list",
        sessionId: "session-1",
        kind: OperationKind.OperationListLargeBlobs,
        error: failureForCode(Code.CodeTransportFailure),
      } as LargeBlobListEnvelope,
    };
    const presentation = buildLargeBlobsPresentation({
      ...defaultView,
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionBusy: false,
      sessionReady: true,
      inventoryState: stale,
      selectedCredentialID: "zero",
    });

    expect(presentation.rows).toHaveLength(3);
    expect(presentation.stale).toBe(true);
    expect(presentation.writeDisabled).toBe(false);
    expect(presentation.deleteDisabled).toBe(false);
    expect(presentation.cleanupDisabled).toBe(false);
  });
});
