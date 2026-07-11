import {
  OperationKind,
  type AuthenticatorConfigOutput,
  type BioEnrollOutput,
  type BioListOutput,
  type BioMutationOutput,
  type CredentialDeleteOutput,
  type CredentialUpdateOutput,
  type CredentialsOutput,
  type InspectResult,
  type LargeBlobListOutput,
  type LargeBlobMutationOutput,
  type MakeCredentialOutput,
  type PINOutput,
  type ResetFactoryOutput,
} from "../../bindings/github.com/go-ctap/kit/model";
import type { BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
import type {
  DeletePreview,
  DeleteResult,
  InventoryReport,
  UpdateUserPreview,
  UpdateUserResult,
} from "../../bindings/github.com/go-ctap/kit/model/credentials";
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

export function inspectResult(envelope: OperationEnvelope | null | undefined): InspectResult | null {
  if (!isInspectEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

export function bioSensorReport(envelope: OperationEnvelope | null | undefined): BioSensorReport | null {
  if (!isBioSensorEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function credentialsReport(envelope: OperationEnvelope | null | undefined): InventoryReport | null {
  if (!isCredentialsEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function credentialDeleteOutput(envelope: OperationEnvelope | null | undefined): CredentialDeleteOutput | null {
  if (!isCredentialDeleteEnvelopeValue(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result;
}

export function credentialDeletePreview(envelope: OperationEnvelope | null | undefined): DeletePreview | null {
  const output = credentialDeleteOutput(envelope);
  return output ? output.preview : null;
}

export function credentialDeleteResult(envelope: OperationEnvelope | null | undefined): DeleteResult | null {
  const output = credentialDeleteOutput(envelope);
  return output ? output.result : null;
}

export function credentialUpdateOutput(envelope: OperationEnvelope | null | undefined): CredentialUpdateOutput | null {
  if (!isCredentialUpdateEnvelopeValue(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result;
}

export function credentialUpdatePreview(envelope: OperationEnvelope | null | undefined): UpdateUserPreview | null {
  const output = credentialUpdateOutput(envelope);
  return output ? output.preview : null;
}

export function credentialUpdateResult(envelope: OperationEnvelope | null | undefined): UpdateUserResult | null {
  const output = credentialUpdateOutput(envelope);
  return output ? output.result : null;
}

export function operationError(envelope: OperationEnvelope | null | undefined) {
  if (!envelope || !envelope.error) return null;
  return envelope.error.message;
}

export function operationEnvelopeLogData(envelope: OperationEnvelope) {
  return {
    operationId: envelope.operationId,
    sessionId: envelope.sessionId,
    kind: envelope.kind,
    error: envelope.error ?? null,
    result: operationResultSummary(envelope) ?? null,
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

function isCredentialsEnvelope(envelope: OperationEnvelope | null | undefined): envelope is CredentialsEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationListCredentials);
}

function isCredentialDeleteEnvelopeValue(envelope: OperationEnvelope | null | undefined): envelope is CredentialDeleteEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationDeleteCredential);
}

function isCredentialUpdateEnvelopeValue(envelope: OperationEnvelope | null | undefined): envelope is CredentialUpdateEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationUpdateCredentialUser);
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

function credentialListSummary(output: CredentialsOutput): OperationResultSummary {
  const credentials = output.report.summary.totalCredentials;
  return {
    kind: OperationKind.OperationListCredentials,
    counts: {
      ...(output.report.groups ? { groups: output.report.groups.length } : {}),
      ...(credentials !== undefined ? { credentials } : {}),
    },
  };
}

function bioListSummary(output: BioListOutput): OperationResultSummary {
  return {
    kind: OperationKind.OperationBioList,
    counts: { enrollments: output.report.enrollments.length },
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
  const blobCount = output.report.array.blobCount;
  return {
    kind: OperationKind.OperationListLargeBlobs,
    counts: {
      ...(output.report.credentials ? { credentials: output.report.credentials.length } : {}),
      ...(blobCount !== undefined ? { blobs: blobCount } : {}),
    },
  };
}

function credentialDeleteSummary(output: CredentialDeleteOutput): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationDeleteCredential, Boolean(output.result), output.preview.warnings?.length);
}

function credentialUpdateSummary(output: CredentialUpdateOutput): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationUpdateCredentialUser, Boolean(output.result), output.preview.warnings?.length);
}

function largeBlobMutationSummary(kind: OperationKind, output: LargeBlobMutationOutput): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function pinSummary(kind: OperationKind, output: PINOutput): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function authenticatorConfigSummary(kind: OperationKind, output: AuthenticatorConfigOutput): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function bioMutationSummary(kind: OperationKind, output: BioMutationOutput): OperationResultSummary {
  return completedPreviewSummary(kind, Boolean(output.result), output.preview.warnings?.length);
}

function resetFactorySummary(output: ResetFactoryOutput): OperationResultSummary {
  return completedPreviewSummary(OperationKind.OperationResetFactory, Boolean(output.result), output.preview.warnings?.length);
}

function makeCredentialSummary(output: MakeCredentialOutput): OperationResultSummary {
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
