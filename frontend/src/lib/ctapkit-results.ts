import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { OperationEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import type { OverviewBioSensorReport, OverviewInspectResult } from "./overview-types.js";
import type { MDSLookupState } from "./stores.js";

type InspectOutput = {
  result?: OverviewInspectResult;
};

type BioSensorOutput = {
  report?: OverviewBioSensorReport;
};

type CountSummary = {
  credentials?: number;
  groups?: number;
  enrollments?: number;
  blobs?: number;
  samples?: number;
  warnings?: number;
};

type CredentialsOutput = {
  report?: {
    groups?: unknown[];
    summary?: {
      totalCredentials?: number;
    };
  };
};

type BioListOutput = {
  report?: {
    enrollments?: unknown[];
  };
};

type BioEnrollOutput = {
  preview?: {
    warnings?: unknown[];
  };
  result?: {
    samples?: unknown[];
  } | null;
};

type LargeBlobListOutput = {
  report?: {
    credentials?: unknown[];
    array?: {
      blobCount?: number;
    };
  };
};

type PreviewResultOutput = {
  preview?: {
    warnings?: unknown[];
  };
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
  if (!isOperation(envelope, OperationKind.OperationInspect)) return null;
  return (envelope.result as InspectOutput).result ?? null;
}

export function bioSensorReport(envelope: OperationEnvelope | null | undefined): OverviewBioSensorReport | null {
  if (!isOperation(envelope, OperationKind.OperationBioSensorInfo)) return null;
  return (envelope.result as BioSensorOutput).report ?? null;
}

export function mdsLookupResult(envelope: MDSLookupState | null | undefined) {
  return envelope?.result ?? null;
}

export function operationError(envelope: OperationEnvelope | MDSLookupState | null | undefined) {
  return envelope?.error?.message || null;
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
  switch (envelope.kind) {
    case OperationKind.OperationInspect:
    case OperationKind.OperationBioSensorInfo:
    case OperationKind.OperationConfigStatus:
    case OperationKind.OperationReadLargeBlob:
    case OperationKind.OperationGetAssertion:
      return { kind: envelope.kind };
    case OperationKind.OperationListCredentials:
      return credentialListSummary(envelope.result as CredentialsOutput);
    case OperationKind.OperationBioList:
      return bioListSummary(envelope.result as BioListOutput);
    case OperationKind.OperationBioEnroll:
      return bioEnrollSummary(envelope.result as BioEnrollOutput);
    case OperationKind.OperationListLargeBlobs:
      return largeBlobListSummary(envelope.result as LargeBlobListOutput);
    case OperationKind.OperationDeleteCredential:
    case OperationKind.OperationUpdateCredentialUser:
    case OperationKind.OperationWriteLargeBlob:
    case OperationKind.OperationDeleteLargeBlob:
    case OperationKind.OperationGarbageCollectLargeBlobs:
    case OperationKind.OperationSetPIN:
    case OperationKind.OperationChangePIN:
    case OperationKind.OperationSetAlwaysUV:
    case OperationKind.OperationSetMinPINLength:
    case OperationKind.OperationBioRename:
    case OperationKind.OperationBioRemove:
    case OperationKind.OperationResetFactory:
    case OperationKind.OperationMakeCredential:
      return previewResultSummary(envelope.kind, envelope.result as PreviewResultOutput);
    default:
      return { kind: envelope.kind };
  }
}

function isOperation(envelope: OperationEnvelope | null | undefined, kind: OperationKind) {
  return Boolean(envelope && !envelope.error && envelope.kind === kind && envelope.result);
}

function credentialListSummary(output: CredentialsOutput): OperationResultSummary {
  const credentials = output.report?.summary?.totalCredentials;
  return {
    kind: OperationKind.OperationListCredentials,
    counts: {
      ...(output.report?.groups ? { groups: output.report.groups.length } : {}),
      ...(credentials !== undefined ? { credentials } : {}),
    },
  };
}

function bioListSummary(output: BioListOutput): OperationResultSummary {
  return {
    kind: OperationKind.OperationBioList,
    counts: output.report?.enrollments ? { enrollments: output.report.enrollments.length } : undefined,
  };
}

function bioEnrollSummary(output: BioEnrollOutput): OperationResultSummary {
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

function largeBlobListSummary(output: LargeBlobListOutput): OperationResultSummary {
  const blobCount = output.report?.array?.blobCount;
  return {
    kind: OperationKind.OperationListLargeBlobs,
    counts: {
      ...(output.report?.credentials ? { credentials: output.report.credentials.length } : {}),
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
