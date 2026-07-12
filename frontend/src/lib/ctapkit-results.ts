import {
  OperationKind,
  type CredentialDeleteOutput,
  type CredentialUpdateOutput,
  type LargeBlobMutationOutput,
} from "../../bindings/github.com/go-ctap/kit/model";
import type { BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
import type {
  DeletePreview,
  DeleteResult,
  InventoryReport,
  UpdateUserPreview,
  UpdateUserResult,
} from "../../bindings/github.com/go-ctap/kit/model/credentials";
import {
  MutationOperation,
  type ListReport as LargeBlobListReport,
  type MutationPreview as LargeBlobMutationPreview,
  type MutationResult as LargeBlobMutationResult,
  type ReadReport as LargeBlobReadReport,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  BioSensorEnvelope,
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import type { OperationEnvelope } from "./api.js";

export function inspectResult(envelope: InspectEnvelope | null | undefined) {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

export function bioSensorReport(envelope: BioSensorEnvelope | null | undefined): BioSensorReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
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

export function largeBlobListReport(envelope: OperationEnvelope | null | undefined): LargeBlobListReport | null {
  if (!isLargeBlobListEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function largeBlobReadReport(envelope: OperationEnvelope | null | undefined): LargeBlobReadReport | null {
  if (!isLargeBlobReadEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function largeBlobMutationOutput(envelope: OperationEnvelope | null | undefined): LargeBlobMutationOutput | null {
  if (!isLargeBlobMutationEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

/**
 * Mutation outputs always carry a generated preview object. Its operation is
 * the typed discriminator between a meaningful preview and the Go zero value.
 * A meaningful preview is intentionally available even when the envelope also
 * carries an error (for example, a capacity failure).
 */
export function largeBlobMutationPreview(envelope: OperationEnvelope | null | undefined): LargeBlobMutationPreview | null {
  const preview = largeBlobMutationOutput(envelope)?.preview;
  return preview && preview.operation !== MutationOperation.$zero ? preview : null;
}

export function largeBlobMutationResult(envelope: OperationEnvelope | null | undefined): LargeBlobMutationResult | null {
  if (envelope?.error) return null;
  return largeBlobMutationOutput(envelope)?.result ?? null;
}

export function operationError(envelope: OperationEnvelope | null | undefined) {
  if (!envelope || !envelope.error) return null;
  return envelope.error.message;
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

function isLargeBlobListEnvelope(envelope: OperationEnvelope | null | undefined): envelope is LargeBlobListEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationListLargeBlobs);
}

function isLargeBlobReadEnvelope(envelope: OperationEnvelope | null | undefined): envelope is LargeBlobReadEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationReadLargeBlob);
}

function isLargeBlobMutationEnvelope(envelope: OperationEnvelope | null | undefined): envelope is LargeBlobMutationEnvelope {
  return Boolean(envelope && [
    OperationKind.OperationWriteLargeBlob,
    OperationKind.OperationDeleteLargeBlob,
    OperationKind.OperationGarbageCollectLargeBlobs,
  ].includes(envelope.kind));
}
