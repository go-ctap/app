import { describe, expect, it } from "vitest";

import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { OperationKind, type InspectResult } from "../../bindings/github.com/go-ctap/kit/model";
import { BioModality, type BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { MutationOperation } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  BioEnrollEnvelope,
  BioSensorEnvelope,
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
  MakeCredentialEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import type { OperationEnvelope } from "./api";
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
  operationEnvelopeLogData,
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

  it("does not extract inspect output from another operation kind", () => {
    const envelope = {
      kind: OperationKind.OperationBioSensorInfo,
      result: { result: { device, info: { versions: [], aaguid: "", conformance: new Report() } } },
    } as unknown as BioSensorEnvelope;

    expect(inspectResult(envelope)).toBeNull();
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

  it("summarizes operation log data without generic result sniffing", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      result: {
        report: {
          summary: { totalCredentials: 2 },
          groups: [{ rpID: "example.test" }],
        },
      },
    } as CredentialsEnvelope;

    expect(operationEnvelopeLogData(envelope)).toEqual({
      operationId: "op-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      error: null,
      result: {
        kind: OperationKind.OperationListCredentials,
        counts: {
          groups: 1,
          credentials: 2,
        },
      },
    });
  });

  it("summarizes typed preview envelopes through the canonical operation envelope", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-2",
      sessionId: "session-1",
      kind: OperationKind.OperationSetPIN,
      result: {
        preview: {
          warnings: [{ message: "short pin" }],
        },
        result: null,
      },
    } as PINEnvelope;

    expect(operationEnvelopeLogData(envelope)).toEqual({
      operationId: "op-2",
      sessionId: "session-1",
      kind: OperationKind.OperationSetPIN,
      error: null,
      result: {
        kind: OperationKind.OperationSetPIN,
        completed: false,
        hasPreview: true,
        counts: {
          warnings: 1,
        },
      },
    });
  });

  it("summarizes large blob mutations through their typed envelope", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-3",
      sessionId: "session-1",
      kind: OperationKind.OperationWriteLargeBlob,
      result: {
        preview: {
          operation: MutationOperation.MutationReplace,
          warnings: [{ message: "overwrite" }],
        },
        result: {
          blobCountAfter: 1,
        },
      },
    } as LargeBlobMutationEnvelope;

    expect(operationEnvelopeLogData(envelope).result).toEqual({
      kind: OperationKind.OperationWriteLargeBlob,
      completed: true,
      hasPreview: true,
      counts: {
        warnings: 1,
      },
    });
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

  it("summarizes large blob reads without logging raw payload bytes", () => {
    const envelope = {
      operationId: "read-secret",
      sessionId: "session-1",
      kind: OperationKind.OperationReadLargeBlob,
      result: {
        report: {
          device,
          support: { largeBlobs: true, largeBlobKeyExtension: true },
          target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
          largeBlobKeyState: "available",
          array: { read: true, blobCount: 1, blobPresent: true, blobState: "present" },
          blobPresent: true,
          rawHex: "7365637265742d726177",
          rawByteCount: 10,
        },
      },
    } as LargeBlobReadEnvelope;

    const serialized = JSON.stringify(operationEnvelopeLogData(envelope));
    expect(operationEnvelopeLogData(envelope).result).toEqual({
      kind: OperationKind.OperationReadLargeBlob,
    });
    expect(serialized).not.toContain("7365637265742d726177");
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
    expect(operationEnvelopeLogData(capacity).result).toEqual({
      kind: OperationKind.OperationWriteLargeBlob,
      completed: false,
      hasPreview: true,
      counts: { warnings: 0 },
    });

    capacity.result!.preview.operation = MutationOperation.$zero;
    expect(largeBlobMutationPreview(capacity)).toBeNull();
    expect(operationEnvelopeLogData(capacity).result).toBeNull();
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

  it("summarizes bio enroll samples and preview warnings through the typed envelope", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-4",
      sessionId: "session-1",
      kind: OperationKind.OperationBioEnroll,
      result: {
        preview: {
          warnings: [{ message: "touch required" }, { message: "preview only" }],
        },
        result: {
          samples: [{ sampleStatus: "ok" }, { sampleStatus: "retry" }],
        },
      },
    } as unknown as BioEnrollEnvelope;

    expect(operationEnvelopeLogData(envelope).result).toEqual({
      kind: OperationKind.OperationBioEnroll,
      completed: true,
      hasPreview: true,
      counts: {
        samples: 2,
        warnings: 2,
      },
    });
  });

  it("summarizes reset preview through the typed envelope", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-5",
      sessionId: "session-1",
      kind: OperationKind.OperationResetFactory,
      result: {
        preview: {
          warnings: [{ message: "destructive" }],
        },
        result: null,
      },
    } as ResetFactoryEnvelope;

    expect(operationEnvelopeLogData(envelope).result).toEqual({
      kind: OperationKind.OperationResetFactory,
      completed: false,
      hasPreview: true,
      counts: {
        warnings: 1,
      },
    });
  });

  it("summarizes make credential preview through the typed envelope", () => {
    const envelope: OperationEnvelope = {
      operationId: "op-6",
      sessionId: "session-1",
      kind: OperationKind.OperationMakeCredential,
      result: {
        preview: {
          warnings: [{ message: "resident key" }],
        },
        result: {
          response: {},
        },
      },
    } as unknown as MakeCredentialEnvelope;

    expect(operationEnvelopeLogData(envelope).result).toEqual({
      kind: OperationKind.OperationMakeCredential,
      completed: true,
      hasPreview: true,
      counts: {
        warnings: 1,
      },
    });
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
