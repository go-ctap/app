import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type {
  BioEnrollEnvelope,
  BioListEnvelope,
  BioSensorEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import type { OperationEnvelope } from "./api.js";
import type { OverviewBioSensorReport, OverviewInspectResult } from "./overview-types.js";

type CountSummary = {
  credentials?: number;
  groups?: number;
  enrollments?: number;
  blobs?: number;
  samples?: number;
  warnings?: number;
};

type PreviewResultOutput = {
  preview?: { warnings?: unknown[] };
  result?: unknown | null;
};

export type OperationResultSummary = {
  kind: OperationKind;
  completed?: boolean;
  hasPreview?: boolean;
  counts?: CountSummary;
};

export type OperationEnvelopeLogData = {
  operationId?: string;
  sessionId?: string;
  kind?: OperationKind;
  error?: OperationEnvelope["error"];
  result?: OperationResultSummary;
};

export function inspectResult(envelope: OperationEnvelope | null | undefined): OverviewInspectResult | null {
  if (!isInspectEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

export function bioSensorReport(envelope: OperationEnvelope | null | undefined): OverviewBioSensorReport | null {
  if (!isBioSensorEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function operationError(envelope: OperationEnvelope | null | undefined) {
  if (!envelope || !envelope.error) return null;
  return envelope.error.message;
}

export function operationEnvelopeLogData(envelope: OperationEnvelope | null | undefined): OperationEnvelopeLogData | undefined {
  if (!envelope) return undefined;
  return {
    ...(envelope.operationId ? { operationId: envelope.operationId } : {}),
    ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
    ...(envelope.kind ? { kind: envelope.kind } : {}),
    ...(envelope.error ? { error: envelope.error } : {}),
    ...(envelope.result ? { result: operationResultSummary(envelope) } : {}),
  };
}

export function operationResultSummary(envelope: OperationEnvelope): OperationResultSummary | undefined {
  if (envelope.error || !envelope.result) return undefined;

  if (isCredentialsEnvelope(envelope)) return credentialListSummary(envelope.result);
  if (isBioListEnvelope(envelope)) return bioListSummary(envelope.result);
  if (isBioEnrollEnvelope(envelope)) return bioEnrollSummary(envelope.result);
  if (isLargeBlobListEnvelope(envelope)) return largeBlobListSummary(envelope.result);
  if (isPreviewEnvelope(envelope)) return previewResultSummary(envelope.kind, envelope.result);

  return { kind: envelope.kind };
}

function isInspectEnvelope(envelope: OperationEnvelope | null | undefined): envelope is InspectEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationInspect);
}

function isBioSensorEnvelope(envelope: OperationEnvelope | null | undefined): envelope is BioSensorEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationBioSensorInfo);
}

function isCredentialsEnvelope(envelope: OperationEnvelope): envelope is CredentialsEnvelope {
  return envelope.kind === OperationKind.OperationListCredentials;
}

function isBioListEnvelope(envelope: OperationEnvelope): envelope is BioListEnvelope {
  return envelope.kind === OperationKind.OperationBioList;
}

function isBioEnrollEnvelope(envelope: OperationEnvelope): envelope is BioEnrollEnvelope {
  return envelope.kind === OperationKind.OperationBioEnroll;
}

function isLargeBlobListEnvelope(envelope: OperationEnvelope): envelope is LargeBlobListEnvelope {
  return envelope.kind === OperationKind.OperationListLargeBlobs;
}

function isPreviewEnvelope(envelope: OperationEnvelope): envelope is OperationEnvelope & { result: PreviewResultOutput } {
  return [
    OperationKind.OperationDeleteCredential,
    OperationKind.OperationUpdateCredentialUser,
    OperationKind.OperationWriteLargeBlob,
    OperationKind.OperationDeleteLargeBlob,
    OperationKind.OperationGarbageCollectLargeBlobs,
    OperationKind.OperationSetPIN,
    OperationKind.OperationChangePIN,
    OperationKind.OperationSetAlwaysUV,
    OperationKind.OperationSetMinPINLength,
    OperationKind.OperationBioRename,
    OperationKind.OperationBioRemove,
    OperationKind.OperationResetFactory,
    OperationKind.OperationMakeCredential,
  ].includes(envelope.kind);
}

function credentialListSummary(output: NonNullable<CredentialsEnvelope["result"]>): OperationResultSummary {
  const credentials = output.report.summary.totalCredentials;
  return {
    kind: OperationKind.OperationListCredentials,
    counts: {
      ...(output.report.groups ? { groups: output.report.groups.length } : {}),
      ...(credentials !== undefined ? { credentials } : {}),
    },
  };
}

function bioListSummary(output: NonNullable<BioListEnvelope["result"]>): OperationResultSummary {
  return {
    kind: OperationKind.OperationBioList,
    counts: { enrollments: output.report.enrollments.length },
  };
}

function bioEnrollSummary(output: NonNullable<BioEnrollEnvelope["result"]>): OperationResultSummary {
  return {
    kind: OperationKind.OperationBioEnroll,
    completed: Boolean(output.result),
    hasPreview: Boolean(output.preview),
    counts: {
      ...(output.result?.samples ? { samples: output.result.samples.length } : {}),
      ...(output.preview?.warnings ? { warnings: output.preview.warnings.length } : {}),
    },
  };
}

function largeBlobListSummary(output: NonNullable<LargeBlobListEnvelope["result"]>): OperationResultSummary {
  const blobCount = output.report.array.blobCount;
  return {
    kind: OperationKind.OperationListLargeBlobs,
    counts: {
      ...(output.report.credentials ? { credentials: output.report.credentials.length } : {}),
      ...(blobCount !== undefined ? { blobs: blobCount } : {}),
    },
  };
}

function previewResultSummary(kind: OperationKind, output: PreviewResultOutput): OperationResultSummary {
  return {
    kind,
    completed: Boolean(output.result),
    hasPreview: Boolean(output.preview),
    counts: output.preview?.warnings ? { warnings: output.preview.warnings.length } : undefined,
  };
}
