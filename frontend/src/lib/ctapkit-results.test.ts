import { describe, expect, it } from "vitest";

import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { OperationKind, type InspectResult } from "../../bindings/github.com/go-ctap/kit/model";
import { BioModality, type BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { MutationOperation } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  BioSensorEnvelope,
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import {
  bioSensorReport,
  credentialDeletePreview,
  credentialDeleteResult,
  credentialUpdatePreview,
  credentialUpdateResult,
  inspectResult,
  largeBlobListReport,
  largeBlobMutationPreview,
  largeBlobMutationResult,
  largeBlobReadReport,
} from "./ctapkit-results";

const device: DeviceReport = {
  deviceId: "dev-1",
  stableId: true,
  transport: Mode.ModeHID,
  path: "path",
  vendorId: 1,
  productId: 2,
};

describe("ctapkit result extractors", () => {
  it("extracts the nested inspect result from an operation envelope", () => {
    const result: InspectResult = {
      device,
      info: {
        versions: ["FIDO_2_1" as Version],
        aaguid: "00000000-0000-0000-0000-000000000000",
        conformance: new Report(),
      },
    };

    const envelope = { kind: OperationKind.OperationInspect, result: { result } } as InspectEnvelope;

    expect(inspectResult(envelope)).toBe(result);
  });

  it("extracts the nested bio sensor report from an operation envelope", () => {
    const report: BioSensorReport = {
      device,
      supported: true,
      previewOnly: false,
      modality: BioModality.BioModalityFingerprint,
    };

    const envelope = { kind: OperationKind.OperationBioSensorInfo, result: { report } } as BioSensorEnvelope;

    expect(bioSensorReport(envelope)).toBe(report);
  });

  it("extracts typed large blob list and read reports only from successful matching envelopes", () => {
    const list = {
      kind: OperationKind.OperationListLargeBlobs,
      result: {
        report: {
          device,
          support: { largeBlobs: true, largeBlobKeyExtension: true },
          array: { read: true, blobCount: 1, matchedBlobCount: 1, unmatchedBlobCount: 0 },
          credentials: [],
        },
      },
    } as unknown as LargeBlobListEnvelope;
    const read = {
      kind: OperationKind.OperationReadLargeBlob,
      result: {
        report: {
          device,
          support: { largeBlobs: true, largeBlobKeyExtension: true },
          target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
          largeBlobKeyState: "available",
          array: { read: true, blobCount: 1, blobPresent: true, blobState: "present" },
          blobPresent: true,
          rawByteCount: 0,
        },
      },
    } as LargeBlobReadEnvelope;

    expect(largeBlobListReport(list)).toBe(list.result!.report);
    expect(largeBlobReadReport(read)).toBe(read.result!.report);
    expect(largeBlobReadReport(list)).toBeNull();

    list.error = { message: "failed" };
    read.error = { message: "failed" };
    expect(largeBlobListReport(list)).toBeNull();
    expect(largeBlobReadReport(read)).toBeNull();
  });

  it("preserves a meaningful mutation preview on error but rejects the generated zero preview", () => {
    const capacity = {
      operationId: "op-capacity",
      sessionId: "session-1",
      kind: OperationKind.OperationWriteLargeBlob,
      error: { category: "invalid-state", message: "array is too large" },
      result: {
        preview: {
          operation: MutationOperation.MutationCreate,
          serializedLargeBlobArraySizeBefore: 0,
          serializedLargeBlobArraySizeAfter: 2049,
          serializedLargeBlobArrayLimit: 0,
          warnings: [],
        },
        result: null,
      },
    } as unknown as LargeBlobMutationEnvelope;

    expect(largeBlobMutationPreview(capacity)?.serializedLargeBlobArraySizeAfter).toBe(2049);
    expect(largeBlobMutationPreview(capacity)?.serializedLargeBlobArrayLimit).toBe(0);
    expect(largeBlobMutationResult(capacity)).toBeNull();
    capacity.result!.preview.operation = MutationOperation.$zero;
    expect(largeBlobMutationPreview(capacity)).toBeNull();
  });

  it("extracts a completed large blob result only when the envelope itself succeeded", () => {
    const envelope = {
      kind: OperationKind.OperationDeleteLargeBlob,
      result: {
        preview: { operation: MutationOperation.MutationDelete },
        result: { operation: MutationOperation.MutationDelete, credentialIDHex: "cafe", noBlob: false },
      },
    } as LargeBlobMutationEnvelope;

    expect(largeBlobMutationResult(envelope)?.credentialIDHex).toBe("cafe");
    envelope.error = { message: "write may not have completed" };
    expect(largeBlobMutationResult(envelope)).toBeNull();
  });

  it("extracts credential mutation previews and completed results without generic traversal", () => {
    const update = {
      kind: OperationKind.OperationUpdateCredentialUser,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.test",
          current: { userIDHex: "01" },
          proposed: { userIDHex: "02" },
        },
        result: {
          deviceId: "dev-1",
          credentialIDHex: "cafe",
          rpID: "example.test",
          previous: { userIDHex: "01" },
          current: { userIDHex: "02" },
        },
      },
    } as CredentialUpdateEnvelope;
    const deletion = {
      kind: OperationKind.OperationDeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.test" },
        result: { deviceId: "dev-1", credentialIDHex: "cafe", rpID: "example.test" },
      },
    } as CredentialDeleteEnvelope;

    expect(credentialUpdatePreview(update)?.proposed.userIDHex).toBe("02");
    expect(credentialUpdateResult(update)?.current.userIDHex).toBe("02");
    expect(credentialDeletePreview(deletion)?.credentialIDHex).toBe("cafe");
    expect(credentialDeleteResult(deletion)?.deviceId).toBe("dev-1");
  });
});
