import type {
  AuthenticatorConfigOutput,
  AuthenticatorConfigPreview,
  AuthenticatorConfigResult,
  BioEnrollOutput,
  BioEnrollPreview,
  BioEnrollResult,
  BioListReport,
  BioMutationOutput,
  BioMutationPreview,
  BioMutationResult,
  BioSensorReport,
  ResetFactoryOutput,
  ResetPreview,
  ResetResult,
  StatusReport,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import type {
  CredentialTarget,
  DeleteOutput as CredentialDeleteOutput,
  DeletePreview,
  DeleteResult,
  InventoryReport,
  UpdateUserOutput as CredentialUpdateOutput,
  UpdateUserPreview,
  UpdateUserResult,
} from "../../bindings/github.com/go-ctap/kit/model/credentials";
import type {
  ListReport as LargeBlobListReport,
  MutationOutput as LargeBlobMutationOutput,
  MutationPreview as LargeBlobMutationPreview,
  MutationResult as LargeBlobMutationResult,
  ReadReport as LargeBlobReadReport,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
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
  LargeBlobDecodeEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
  GetAssertionEnvelope,
  MakeCredentialEnvelope,
  ResetFactoryEnvelope,
} from "../../bindings/telesma/service";
import type {
  GetAssertionPreview,
  GetAssertionResult,
  MakeCredentialPreview,
  MakeCredentialResult,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";

export function inspectResult(envelope: InspectEnvelope | null | undefined) {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function bioSensorReport(
  envelope: BioSensorEnvelope | null | undefined,
): BioSensorReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function configStatusReport(
  envelope: ConfigStatusEnvelope | null | undefined,
): StatusReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function bioListReport(envelope: BioListEnvelope | null | undefined): BioListReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function authenticatorConfigOutput(
  envelope: AuthenticatorConfigEnvelope | null | undefined,
): AuthenticatorConfigOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function authenticatorConfigPreview(
  envelope: AuthenticatorConfigEnvelope | null | undefined,
): AuthenticatorConfigPreview | null {
  return authenticatorConfigOutput(envelope)?.preview ?? null;
}

export function authenticatorConfigResult(
  envelope: AuthenticatorConfigEnvelope | null | undefined,
): AuthenticatorConfigResult | null {
  return authenticatorConfigOutput(envelope)?.result ?? null;
}

export function bioEnrollOutput(
  envelope: BioEnrollEnvelope | null | undefined,
): BioEnrollOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function bioEnrollPreview(
  envelope: BioEnrollEnvelope | null | undefined,
): BioEnrollPreview | null {
  return bioEnrollOutput(envelope)?.preview ?? null;
}

export function bioEnrollResult(
  envelope: BioEnrollEnvelope | null | undefined,
): BioEnrollResult | null {
  return bioEnrollOutput(envelope)?.result ?? null;
}

export function bioMutationOutput(
  envelope: BioMutationEnvelope | null | undefined,
): BioMutationOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function bioMutationPreview(
  envelope: BioMutationEnvelope | null | undefined,
): BioMutationPreview | null {
  return bioMutationOutput(envelope)?.preview ?? null;
}

export function bioMutationResult(
  envelope: BioMutationEnvelope | null | undefined,
): BioMutationResult | null {
  return bioMutationOutput(envelope)?.result ?? null;
}

export function resetFactoryOutput(
  envelope: ResetFactoryEnvelope | null | undefined,
): ResetFactoryOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function resetFactoryPreview(
  envelope: ResetFactoryEnvelope | null | undefined,
): ResetPreview | null {
  return resetFactoryOutput(envelope)?.preview ?? null;
}

export function resetFactoryResult(
  envelope: ResetFactoryEnvelope | null | undefined,
): ResetResult | null {
  return resetFactoryOutput(envelope)?.result ?? null;
}

export function credentialsReport(
  envelope: CredentialsEnvelope | null | undefined,
): InventoryReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function credentialTarget(
  report: InventoryReport | null,
  credentialIDHex: string,
): CredentialTarget | null {
  for (const group of report?.groups ?? []) {
    const record = group.credentials?.find(
      (credential) => credential.credentialIDHex === credentialIDHex,
    );

    if (!record) continue;

    return {
      record,
      rp: {
        id: group.rpID,
        ...(group.rpName ? { name: group.rpName } : {}),
        ...(group.rpIDHashHex ? { idHashHex: group.rpIDHashHex } : {}),
      },
      user: {
        userIDHex: record.userIDHex ?? "",
        name: record.userName ?? "",
        displayName: record.displayName ?? "",
      },
    };
  }

  return null;
}

export function credentialDeleteOutput(
  envelope: CredentialDeleteEnvelope | null | undefined,
): CredentialDeleteOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function credentialDeletePreview(
  envelope: CredentialDeleteEnvelope | null | undefined,
): DeletePreview | null {
  const output = credentialDeleteOutput(envelope);

  return output ? output.preview : null;
}

export function credentialDeleteResult(
  envelope: CredentialDeleteEnvelope | null | undefined,
): DeleteResult | null {
  const output = credentialDeleteOutput(envelope);

  return output ? output.result : null;
}

export function credentialUpdateOutput(
  envelope: CredentialUpdateEnvelope | null | undefined,
): CredentialUpdateOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function credentialUpdatePreview(
  envelope: CredentialUpdateEnvelope | null | undefined,
): UpdateUserPreview | null {
  const output = credentialUpdateOutput(envelope);

  return output ? output.preview : null;
}

export function credentialUpdateResult(
  envelope: CredentialUpdateEnvelope | null | undefined,
): UpdateUserResult | null {
  const output = credentialUpdateOutput(envelope);

  return output ? output.result : null;
}

export function largeBlobListReport(
  envelope: LargeBlobListEnvelope | null | undefined,
): LargeBlobListReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function largeBlobReadReport(
  envelope: LargeBlobReadEnvelope | null | undefined,
): LargeBlobReadReport | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function largeBlobDecodeResult(envelope: LargeBlobDecodeEnvelope | null | undefined) {
  return envelope?.result ?? null;
}

export function largeBlobMutationOutput(
  envelope: LargeBlobMutationEnvelope | null | undefined,
): LargeBlobMutationOutput | null {
  if (!envelope?.result) return null;

  return envelope.result;
}

export function largeBlobMutationPreview(
  envelope: LargeBlobMutationEnvelope | null | undefined,
): LargeBlobMutationPreview | null {
  return largeBlobMutationOutput(envelope)?.preview ?? null;
}

export function largeBlobMutationResult(
  envelope: LargeBlobMutationEnvelope | null | undefined,
): LargeBlobMutationResult | null {
  return largeBlobMutationOutput(envelope)?.result ?? null;
}

/** Typed traversal for the WebAuthn Lab MakeCredential preview contract. */
export function makeCredentialPreview(
  envelope: MakeCredentialEnvelope | null | undefined,
): MakeCredentialPreview | null {
  if (!envelope?.result) return null;

  return envelope.result.preview;
}

/** Typed traversal for a completed WebAuthn Lab MakeCredential operation. */
export function makeCredentialResult(
  envelope: MakeCredentialEnvelope | null | undefined,
): MakeCredentialResult | null {
  if (!envelope?.result) return null;

  return envelope.result.result;
}

/** Typed traversal for a completed WebAuthn Lab GetAssertion operation. */
export function getAssertionResult(
  envelope: GetAssertionEnvelope | null | undefined,
): GetAssertionResult | null {
  if (!envelope?.result) return null;

  return envelope.result.result;
}

/** Typed traversal for the WebAuthn Lab GetAssertion preview contract. */
export function getAssertionPreview(
  envelope: GetAssertionEnvelope | null | undefined,
): GetAssertionPreview | null {
  if (!envelope?.result) return null;

  return envelope.result.preview;
}
