import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type {
  AuthenticatorConfigEnvelope,
  BioEnrollEnvelope,
  BioListEnvelope,
  BioMutationEnvelope,
  BioSensorEnvelope,
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  MakeCredentialEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
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
  if (isCredentialDeleteEnvelope(envelope)) return credentialDeleteSummary(envelope.result);
  if (isCredentialUpdateEnvelope(envelope)) return credentialUpdateSummary(envelope.result);
  if (isLargeBlobMutationEnvelope(envelope)) return largeBlobMutationSummary(envelope.kind, envelope.result);
  if (isPINEnvelope(envelope)) return pinSummary(envelope.kind, envelope.result);
  if (isAuthenticatorConfigEnvelope(envelope)) return authenticatorConfigSummary(envelope.kind, envelope.result);
  if (isBioMutationEnvelope(envelope)) return bioMutationSummary(envelope.kind, envelope.result);
  if (isResetFactoryEnvelope(envelope)) return resetFactorySummary(envelope.result);
  if (isMakeCredentialEnvelope(envelope)) return makeCredentialSummary(envelope.result);

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

function isCredentialDeleteEnvelope(envelope: OperationEnvelope): envelope is CredentialDeleteEnvelope {
  return envelope.kind === OperationKind.OperationDeleteCredential;
}

function isCredentialUpdateEnvelope(envelope: OperationEnvelope): envelope is CredentialUpdateEnvelope {
  return envelope.kind === OperationKind.OperationUpdateCredentialUser;
}

function isLargeBlobMutationEnvelope(envelope: OperationEnvelope): envelope is LargeBlobMutationEnvelope {
  return [
    OperationKind.OperationWriteLargeBlob,
    OperationKind.OperationDeleteLargeBlob,
    OperationKind.OperationGarbageCollectLargeBlobs,
  ].includes(envelope.kind);
}

function isPINEnvelope(envelope: OperationEnvelope): envelope is PINEnvelope {
  return [
    OperationKind.OperationSetPIN,
    OperationKind.OperationChangePIN,
  ].includes(envelope.kind);
}

function isAuthenticatorConfigEnvelope(envelope: OperationEnvelope): envelope is AuthenticatorConfigEnvelope {
  return [
    OperationKind.OperationSetAlwaysUV,
    OperationKind.OperationSetMinPINLength,
  ].includes(envelope.kind);
}

function isBioMutationEnvelope(envelope: OperationEnvelope): envelope is BioMutationEnvelope {
  return [
    OperationKind.OperationBioRename,
    OperationKind.OperationBioRemove,
  ].includes(envelope.kind);
}

function isResetFactoryEnvelope(envelope: OperationEnvelope): envelope is ResetFactoryEnvelope {
  return envelope.kind === OperationKind.OperationResetFactory;
}

function isMakeCredentialEnvelope(envelope: OperationEnvelope): envelope is MakeCredentialEnvelope {
  return envelope.kind === OperationKind.OperationMakeCredential;
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

function credentialDeleteSummary(output: NonNullable<CredentialDeleteEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationDeleteCredential, Boolean(output.result), output.preview.warnings?.length);
}

function credentialUpdateSummary(output: NonNullable<CredentialUpdateEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationUpdateCredentialUser, Boolean(output.result), output.preview.warnings?.length);
}

function largeBlobMutationSummary(kind: OperationKind, output: NonNullable<LargeBlobMutationEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function pinSummary(kind: OperationKind, output: NonNullable<PINEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function authenticatorConfigSummary(kind: OperationKind, output: NonNullable<AuthenticatorConfigEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function bioMutationSummary(kind: OperationKind, output: NonNullable<BioMutationEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function resetFactorySummary(output: NonNullable<ResetFactoryEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationResetFactory, Boolean(output.result), output.preview.warnings?.length);
}

function makeCredentialSummary(output: NonNullable<MakeCredentialEnvelope["result"]>): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationMakeCredential, Boolean(output.result), output.preview.warnings?.length);
}

function completedPreviewSummary(kind: OperationKind, completed: boolean, warningCount?: number): OperationResultSummary {
  return {
    kind,
    completed,
    hasPreview: true,
    counts: warningCount !== undefined ? { warnings: warningCount } : undefined,
  };
}
