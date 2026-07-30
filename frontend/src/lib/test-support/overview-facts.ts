import {
  Assessment,
  Fact,
  FactID,
  FactOrigin,
  FactState,
  FactValue,
  FactValueKind,
} from "../../../bindings/github.com/go-ctap/kit/model/inspect";

const factKinds = new Map<FactID, FactValueKind>([
  ...withKind(FactValueKind.FactValueText, [
    FactID.FactIDAAGUID,
    FactID.FactIDEncryptedDeviceIdentifier,
    FactID.FactIDEncryptedCredentialStoreState,
    FactID.FactIDPINComplexityPolicyURL,
  ]),
  ...withKind(FactValueKind.FactValueList, [
    FactID.FactIDTransports,
    FactID.FactIDVersions,
    FactID.FactIDAlgorithms,
    FactID.FactIDPinUvAuthProtocols,
    FactID.FactIDAuthenticatorConfigCommands,
    FactID.FactIDVendorPrototypeConfigCommands,
    FactID.FactIDTransportsForReset,
    FactID.FactIDAttestationFormats,
    FactID.FactIDCertifications,
  ]),
  ...withKind(FactValueKind.FactValueInteger, [
    FactID.FactIDUvModality,
    FactID.FactIDPreferredPlatformUVAttempts,
    FactID.FactIDUVCountSinceLastPINEntry,
    FactID.FactIDMaxSerializedLargeBlobArray,
    FactID.FactIDMaxCredBlobLength,
    FactID.FactIDMaxRPIDsForSetMinPINLength,
    FactID.FactIDEffectiveMaxMessageSize,
    FactID.FactIDMaxCredentialCountInList,
    FactID.FactIDMaxCredentialIDLength,
    FactID.FactIDEffectiveMinPINLength,
    FactID.FactIDEffectiveMaxPINLength,
    FactID.FactIDRemainingDiscoverableCredentials,
    FactID.FactIDFirmwareVersion,
  ]),
]);

export function testOverviewFact(
  id: FactID,
  source: string,
  state: FactState,
  origin: FactOrigin,
  value: FactValue,
) {
  return new Fact({ id, source, state, origin, value });
}

export function testOverviewAssessment(overrides: readonly Fact[] = []) {
  const byID = new Map(overrides.map((fact) => [fact.id, fact]));
  const facts = allFactIDs().map((id) => byID.get(id) ?? unknownFact(id));

  return new Assessment({ facts });
}

function allFactIDs() {
  return Object.values(FactID).filter((id): id is FactID => id !== FactID.$zero);
}

function unknownFact(id: FactID) {
  return new Fact({
    id,
    source: id,
    state: FactState.FactStateUnknown,
    origin: FactOrigin.FactOriginAbsent,
    value: new FactValue({ kind: factKinds.get(id) ?? FactValueKind.FactValueBoolean }),
  });
}

function withKind(kind: FactValueKind, ids: readonly FactID[]) {
  return ids.map((id) => [id, kind] as const);
}
