import {
  type AuthenticatorConfigOutput,
  type BioEnrollOutput,
  type BioMutationOutput,
  type CredentialDeleteOutput,
  type CredentialStoreStateOutput,
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
  StoreStateResult,
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
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
  GetAssertionEnvelope,
  MakeCredentialEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import type {
  GetAssertionPreview,
  GetAssertionResult,
  MakeCredentialPreview,
  MakeCredentialResult,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";

import type { OperationEnvelope } from "./api.js";
import { failureMessage } from "./failure.js";

export function inspectResult(envelope: InspectEnvelope | null | undefined) {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

export function bioSensorReport(envelope: BioSensorEnvelope | null | undefined): BioSensorReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function configStatusReport(envelope: ConfigStatusEnvelope | null | undefined): StatusReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function bioListReport(envelope: BioListEnvelope | null | undefined): BioListReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function pinMutationOutput(envelope: PINEnvelope | null | undefined): PINOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

export function pinMutationPreview(envelope: PINEnvelope | null | undefined): PINMutationPreview | null {
  const preview = pinMutationOutput(envelope)?.preview;
  return preview && preview.operation !== PINMutationOperation.$zero ? preview : null;
}

export function pinMutationResult(envelope: PINEnvelope | null | undefined): PINMutationResult | null {
  if (envelope?.error) return null;
  return pinMutationOutput(envelope)?.result ?? null;
}

export function authenticatorConfigOutput(envelope: AuthenticatorConfigEnvelope | null | undefined): AuthenticatorConfigOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

export function authenticatorConfigPreview(envelope: AuthenticatorConfigEnvelope | null | undefined): AuthenticatorConfigPreview | null {
  const preview = authenticatorConfigOutput(envelope)?.preview;
  return preview && preview.operation !== AuthenticatorConfigOperation.$zero ? preview : null;
}

export function authenticatorConfigResult(envelope: AuthenticatorConfigEnvelope | null | undefined): AuthenticatorConfigResult | null {
  if (envelope?.error) return null;
  return authenticatorConfigOutput(envelope)?.result ?? null;
}

export function bioEnrollOutput(envelope: BioEnrollEnvelope | null | undefined): BioEnrollOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

export function bioEnrollPreview(envelope: BioEnrollEnvelope | null | undefined): BioEnrollPreview | null {
  const preview = bioEnrollOutput(envelope)?.preview;
  return preview && preview.mode !== PreviewMode.$zero ? preview : null;
}

/**
 * Enrollment can fail after one or more samples were captured. The generated
 * result is therefore useful partial progress even when the envelope has an
 * error, unlike the result of an atomic mutation.
 */
export function bioEnrollResult(envelope: BioEnrollEnvelope | null | undefined): BioEnrollResult | null {
  return bioEnrollOutput(envelope)?.result ?? null;
}

export function bioMutationOutput(envelope: BioMutationEnvelope | null | undefined): BioMutationOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

export function bioMutationPreview(envelope: BioMutationEnvelope | null | undefined): BioMutationPreview | null {
  const preview = bioMutationOutput(envelope)?.preview;
  return preview && preview.operation !== BioMutationOperation.$zero ? preview : null;
}

export function bioMutationResult(envelope: BioMutationEnvelope | null | undefined): BioMutationResult | null {
  if (envelope?.error) return null;
  return bioMutationOutput(envelope)?.result ?? null;
}

export function resetFactoryOutput(envelope: ResetFactoryEnvelope | null | undefined): ResetFactoryOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

export function resetFactoryPreview(envelope: ResetFactoryEnvelope | null | undefined): ResetPreview | null {
  const preview = resetFactoryOutput(envelope)?.preview;
  return preview && preview.mode !== PreviewMode.$zero ? preview : null;
}

export function resetFactoryResult(envelope: ResetFactoryEnvelope | null | undefined): ResetResult | null {
  if (envelope?.error) return null;
  return resetFactoryOutput(envelope)?.result ?? null;
}

export function credentialsReport(envelope: CredentialsEnvelope | null | undefined): InventoryReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function credentialStoreStateOutput(
  envelope: CredentialStoreStateEnvelope | null | undefined,
): CredentialStoreStateOutput | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result;
}

export function credentialStoreStateResult(
  envelope: CredentialStoreStateEnvelope | null | undefined,
): StoreStateResult | null {
  return credentialStoreStateOutput(envelope)?.result ?? null;
}

export function credentialDeleteOutput(envelope: CredentialDeleteEnvelope | null | undefined): CredentialDeleteOutput | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result;
}

export function credentialDeletePreview(envelope: CredentialDeleteEnvelope | null | undefined): DeletePreview | null {
  const output = credentialDeleteOutput(envelope);
  return output ? output.preview : null;
}

export function credentialDeleteResult(envelope: CredentialDeleteEnvelope | null | undefined): DeleteResult | null {
  const output = credentialDeleteOutput(envelope);
  return output ? output.result : null;
}

export function credentialUpdateOutput(envelope: CredentialUpdateEnvelope | null | undefined): CredentialUpdateOutput | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result;
}

export function credentialUpdatePreview(envelope: CredentialUpdateEnvelope | null | undefined): UpdateUserPreview | null {
  const output = credentialUpdateOutput(envelope);
  return output ? output.preview : null;
}

export function credentialUpdateResult(envelope: CredentialUpdateEnvelope | null | undefined): UpdateUserResult | null {
  const output = credentialUpdateOutput(envelope);
  return output ? output.result : null;
}

export function largeBlobListReport(envelope: LargeBlobListEnvelope | null | undefined): LargeBlobListReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function largeBlobReadReport(envelope: LargeBlobReadEnvelope | null | undefined): LargeBlobReadReport | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.report;
}

export function largeBlobMutationOutput(envelope: LargeBlobMutationEnvelope | null | undefined): LargeBlobMutationOutput | null {
  if (!envelope || !envelope.result) return null;
  return envelope.result;
}

/**
 * Mutation outputs always carry a generated preview object. Its operation is
 * the typed discriminator between a meaningful preview and the Go zero value.
 * A meaningful preview is intentionally available even when the envelope also
 * carries an error (for example, a capacity failure).
 */
export function largeBlobMutationPreview(envelope: LargeBlobMutationEnvelope | null | undefined): LargeBlobMutationPreview | null {
  const preview = largeBlobMutationOutput(envelope)?.preview;
  return preview && preview.operation !== MutationOperation.$zero ? preview : null;
}

export function largeBlobMutationResult(envelope: LargeBlobMutationEnvelope | null | undefined): LargeBlobMutationResult | null {
  if (envelope?.error) return null;
  return largeBlobMutationOutput(envelope)?.result ?? null;
}

/** Typed traversal for the WebAuthn Lab MakeCredential preview contract. */
export function makeCredentialPreview(envelope: MakeCredentialEnvelope | null | undefined): MakeCredentialPreview | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.preview;
}

/** Typed traversal for a completed WebAuthn Lab MakeCredential operation. */
export function makeCredentialResult(envelope: MakeCredentialEnvelope | null | undefined): MakeCredentialResult | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

/** Typed traversal for a completed WebAuthn Lab GetAssertion operation. */
export function getAssertionResult(envelope: GetAssertionEnvelope | null | undefined): GetAssertionResult | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.result;
}

/** Typed traversal for the WebAuthn Lab GetAssertion preview contract. */
export function getAssertionPreview(envelope: GetAssertionEnvelope | null | undefined): GetAssertionPreview | null {
  if (!envelope || envelope.error || !envelope.result) return null;
  return envelope.result.preview;
}

export function operationError(envelope: OperationEnvelope | null | undefined) {
  if (!envelope || !envelope.error) return null;
  return failureMessage(envelope.error);
}
