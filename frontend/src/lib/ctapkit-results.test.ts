import { describe, expect, it } from "vitest";
import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";
import type {
  BioEnrollEnvelope,
  BioSensorEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobMutationEnvelope,
  MakeCredentialEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { InspectResult } from "../../bindings/github.com/go-ctap/kit/model";
import { BioModality } from "../../bindings/github.com/go-ctap/kit/model/config";
import type { BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
import type { OperationEnvelope } from "./api";
import { bioSensorReport, inspectResult, operationEnvelopeLogData } from "./ctapkit-results";

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
        conformanceFindings: [],
      },
    };

    const envelope = { kind: OperationKind.OperationInspect, result: { result } } as InspectEnvelope;

    expect(inspectResult(envelope)).toBe(result);
  });

  it("does not extract inspect output from another operation kind", () => {
    const envelope = {
      kind: OperationKind.OperationBioSensorInfo,
      result: { result: { device, info: { versions: [], aaguid: "", conformanceFindings: [] } } },
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
});
