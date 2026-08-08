import {
  UserVerify,
  type AuthenticatorGetInfoResponse,
} from "../../bindings/github.com/telesma-app/ctap/protocol";
import { Metadata } from "../../bindings/github.com/telesma-app/kit/conformance/ctap23";
import type { LookupResult } from "../../bindings/github.com/telesma-app/mds/model";

const OPTIONAL_GET_INFO_FIELDS = [
  ["options", 4],
  ["maxMsgSize", 5],
  ["pinUvAuthProtocols", 6],
  ["maxCredentialCountInList", 7],
  ["maxCredentialIdLength", 8],
  ["transports", 9],
  ["algorithms", 10],
  ["maxSerializedLargeBlobArray", 11],
  ["forcePINChange", 12],
  ["minPINLength", 13],
  ["firmwareVersion", 14],
  ["maxCredBlobLength", 15],
  ["maxRPIDsForSetMinPINLength", 16],
  ["preferredPlatformUvAttempts", 17],
  ["uvModality", 18],
  ["certifications", 19],
  ["remainingDiscoverableCredentials", 20],
  ["vendorPrototypeConfigCommands", 21],
  ["attestationFormats", 22],
  ["uvCountSinceLastPinEntry", 23],
  ["longTouchForReset", 24],
  ["encIdentifier", 25],
  ["transportsForReset", 26],
  ["pinComplexityPolicy", 27],
  ["pinComplexityPolicyURL", 28],
  ["maxPINLength", 29],
  ["encCredStoreState", 30],
  ["authenticatorConfigCommands", 31],
] as const satisfies ReadonlyArray<readonly [keyof AuthenticatorGetInfoResponse, number]>;

const USER_VERIFY_BY_NAME = {
  presence_internal: UserVerify.UserVerifyPresenceInternal,
  fingerprint_internal: UserVerify.UserVerifyFingerprintInternal,
  passcode_internal: UserVerify.UserVerifyPasscodeInternal,
  voiceprint_internal: UserVerify.UserVerifyVoiceprintInternal,
  faceprint_internal: UserVerify.UserVerifyFaceprintInternal,
  location_internal: UserVerify.UserVerifyLocationInternal,
  eyeprint_internal: UserVerify.UserVerifyEyeprintInternal,
  pattern_internal: UserVerify.UserVerifyPatternInternal,
  handprint_internal: UserVerify.UserVerifyHandprintInternal,
  none: UserVerify.UserVerifyNone,
  all: UserVerify.UserVerifyAll,
  passcode_external: UserVerify.UserVerifyPasscodeExternal,
  pattern_external: UserVerify.UserVerifyPatternExternal,
} as const;

function getInfoFields(getInfo: AuthenticatorGetInfoResponse) {
  const fields = [1, 2, 3];

  for (const [property, field] of OPTIONAL_GET_INFO_FIELDS) {
    if (getInfo[property] !== undefined) fields.push(field);
  }

  return fields;
}

function descriptorMethod(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("userVerificationMethod" in value)) {
    return null;
  }

  const method = value.userVerificationMethod;

  return typeof method === "string" ? method : null;
}

function userVerificationMethods(details: unknown[]): UserVerify {
  let methods = Number(UserVerify.$zero);

  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) collect(item);

      return;
    }

    const method = descriptorMethod(value);
    if (method && method in USER_VERIFY_BY_NAME) {
      methods |= USER_VERIFY_BY_NAME[method as keyof typeof USER_VERIFY_BY_NAME];
    }
  };

  collect(details);

  return methods as UserVerify;
}

export function buildCTAP23Metadata(lookup: LookupResult | null): Metadata | null {
  if (!lookup?.found || !lookup.entry) return null;

  const statement = lookup.entry.metadataStatement;
  if (!statement) return null;

  const getInfo = statement.authenticatorGetInfo;

  if (!getInfo || !getInfo.versions.length || !getInfo.aaguid) return null;

  return new Metadata({
    getInfo,
    getInfoFields: getInfoFields(getInfo),
    userVerificationMethods: userVerificationMethods(statement.userVerificationDetails),
  });
}
