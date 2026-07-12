import {
  OperationKind,
  type AuthenticatorConfigOutput,
  type BioEnrollOutput,
  type BioMutationOutput,
  type CredentialDeleteOutput,
  type CredentialUpdateOutput,
  type LargeBlobMutationOutput,
  type PINOutput,
  type ResetFactoryOutput,
} from "../../bindings/github.com/go-ctap/kit/model";
import {
  AuthenticatorConfigOperation,
  BioMutationOperation,
  PINMutationOperation,
  type AuthenticatorConfigPreview,
  type AuthenticatorConfigResult,
  type BioEnrollPreview,
  type BioEnrollResult,
  type BioListReport,
  type BioMutationPreview,
  type BioMutationResult,
  type BioSensorReport,
  type PINMutationPreview,
  type PINMutationResult,
  type ResetPreview,
  type ResetResult,
  type StatusReport,
} from "../../bindings/github.com/go-ctap/kit/model/config";
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
import { PreviewMode } from "../../bindings/github.com/go-ctap/kit/model/safety";
import type {
  AuthenticatorConfigEnvelope,
  BioEnrollEnvelope,
  BioListEnvelope,
  BioMutationEnvelope,
  BioSensorEnvelope,
  ConfigStatusEnvelope,
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
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

export function configStatusReport(envelope: OperationEnvelope | null | undefined): StatusReport | null {
  if (!isConfigStatusEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function bioListReport(envelope: OperationEnvelope | null | undefined): BioListReport | null {
  if (!isBioListEnvelope(envelope) || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function pinMutationOutput(envelope: OperationEnvelope | null | undefined): PINOutput | null {
  if (!isPINEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

export function pinMutationPreview(envelope: OperationEnvelope | null | undefined): PINMutationPreview | null {
  const preview = pinMutationOutput(envelope)?.preview;
  return preview && preview.operation !== PINMutationOperation.$zero ? preview : null;
}

export function pinMutationResult(envelope: OperationEnvelope | null | undefined): PINMutationResult | null {
  if (envelope?.error) return null;
  return pinMutationOutput(envelope)?.result ?? null;
}

export function authenticatorConfigOutput(envelope: OperationEnvelope | null | undefined): AuthenticatorConfigOutput | null {
  if (!isAuthenticatorConfigEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

export function authenticatorConfigPreview(envelope: OperationEnvelope | null | undefined): AuthenticatorConfigPreview | null {
  const preview = authenticatorConfigOutput(envelope)?.preview;
  return preview && preview.operation !== AuthenticatorConfigOperation.$zero ? preview : null;
}

export function authenticatorConfigResult(envelope: OperationEnvelope | null | undefined): AuthenticatorConfigResult | null {
  if (envelope?.error) return null;
  return authenticatorConfigOutput(envelope)?.result ?? null;
}

export function bioEnrollOutput(envelope: OperationEnvelope | null | undefined): BioEnrollOutput | null {
  if (!isBioEnrollEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

export function bioEnrollPreview(envelope: OperationEnvelope | null | undefined): BioEnrollPreview | null {
  const preview = bioEnrollOutput(envelope)?.preview;
  return preview && preview.mode !== PreviewMode.$zero ? preview : null;
}

/**
 * Enrollment can fail after one or more samples were captured. The generated
 * result is therefore useful partial progress even when the envelope has an
 * error, unlike the result of an atomic mutation.
 */
export function bioEnrollResult(envelope: OperationEnvelope | null | undefined): BioEnrollResult | null {
  return bioEnrollOutput(envelope)?.result ?? null;
}

export function bioMutationOutput(envelope: OperationEnvelope | null | undefined): BioMutationOutput | null {
  if (!isBioMutationEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

export function bioMutationPreview(envelope: OperationEnvelope | null | undefined): BioMutationPreview | null {
  const preview = bioMutationOutput(envelope)?.preview;
  return preview && preview.operation !== BioMutationOperation.$zero ? preview : null;
}

export function bioMutationResult(envelope: OperationEnvelope | null | undefined): BioMutationResult | null {
  if (envelope?.error) return null;
  return bioMutationOutput(envelope)?.result ?? null;
}

export function resetFactoryOutput(envelope: OperationEnvelope | null | undefined): ResetFactoryOutput | null {
  if (!isResetFactoryEnvelope(envelope) || !envelope.result) return null;
  return envelope.result;
}

export function resetFactoryPreview(envelope: OperationEnvelope | null | undefined): ResetPreview | null {
  const preview = resetFactoryOutput(envelope)?.preview;
  return preview && preview.mode !== PreviewMode.$zero ? preview : null;
}

export function resetFactoryResult(envelope: OperationEnvelope | null | undefined): ResetResult | null {
  if (envelope?.error) return null;
  return resetFactoryOutput(envelope)?.result ?? null;
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

function isConfigStatusEnvelope(envelope: OperationEnvelope | null | undefined): envelope is ConfigStatusEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationConfigStatus);
}

function isBioListEnvelope(envelope: OperationEnvelope | null | undefined): envelope is BioListEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationBioList);
}

function isPINEnvelope(envelope: OperationEnvelope | null | undefined): envelope is PINEnvelope {
  return Boolean(envelope && [
    OperationKind.OperationSetPIN,
    OperationKind.OperationChangePIN,
  ].includes(envelope.kind));
}

function isAuthenticatorConfigEnvelope(envelope: OperationEnvelope | null | undefined): envelope is AuthenticatorConfigEnvelope {
  return Boolean(envelope && [
    OperationKind.OperationSetAlwaysUV,
    OperationKind.OperationSetMinPINLength,
  ].includes(envelope.kind));
}

function isBioEnrollEnvelope(envelope: OperationEnvelope | null | undefined): envelope is BioEnrollEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationBioEnroll);
}

function isBioMutationEnvelope(envelope: OperationEnvelope | null | undefined): envelope is BioMutationEnvelope {
  return Boolean(envelope && [
    OperationKind.OperationBioRename,
    OperationKind.OperationBioRemove,
  ].includes(envelope.kind));
}

function isResetFactoryEnvelope(envelope: OperationEnvelope | null | undefined): envelope is ResetFactoryEnvelope {
  return Boolean(envelope && envelope.kind === OperationKind.OperationResetFactory);
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
