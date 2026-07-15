import {
  PublicKeyCredentialDescriptor,
  PublicKeyCredentialParameters,
  PublicKeyCredentialRpEntity,
  PublicKeyCredentialType,
  PublicKeyCredentialUserEntity,
} from "../../bindings/github.com/go-ctap/ctap/credential";
import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import {
  AuthenticationExtensionsPRFInputs,
  AuthenticationExtensionsPRFValues,
  CreateAuthenticationExtensionsClientInputs,
  GetAuthenticationExtensionsClientInputs,
  HMACGetSecretInput,
} from "../../bindings/github.com/go-ctap/ctap/webauthn";
import { AuthenticatorOptions } from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
  GetAssertionRequest,
  MakeCredentialRequest,
  type SessionID,
} from "../../bindings/github.com/go-ctap/kit/service";

import type {
  GetAssertionDraft,
  LabBinaryDraft,
  LabClientDataDraft,
  LabDescriptorDraft,
  LabTriState,
  MakeCredentialDraft,
} from "./features/lab/state.js";

export type LabRandomSource = (target: Uint8Array<ArrayBuffer>) => void | Uint8Array<ArrayBuffer>;
export type LabClientDataOperation = "create" | "get";
export type LabValidationCode =
  | "required"
  | "invalid-origin"
  | "invalid-base64url"
  | "invalid-hex"
  | "invalid-algorithm"
  | "invalid-json"
  | "invalid-length"
  | "too-long"
  | "extension-conflict"
  | "unsupported-prf-credential-selection";

export type LabValidationIssue = {
  field: string;
  code: LabValidationCode;
};

export type LabValidationResult = {
  valid: boolean;
  errors: LabValidationIssue[];
  warnings: LabValidationIssue[];
};

function defaultRandomSource(target: Uint8Array<ArrayBuffer>) {
  globalThis.crypto.getRandomValues(target);
}

function randomBytes(byteLength: number, randomSource: LabRandomSource = defaultRandomSource) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new RangeError("byteLength must be a non-negative safe integer");
  }
  const bytes = new Uint8Array(byteLength);
  randomSource(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function strictBase64ToBytes(value: string) {
  if (value === "") return new Uint8Array();
  if (
    value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new Error("invalid base64");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64(bytes) !== value) throw new Error("non-canonical base64");
  return bytes;
}

function bytesToBase64URL(bytes: Uint8Array) {
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function strictBase64URLToBytes(value: string) {
  if (value === "" || !/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw new Error("invalid base64url");
  }
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "=");
  const bytes = strictBase64ToBytes(padded);
  if (bytesToBase64URL(bytes) !== value) throw new Error("non-canonical base64url");
  return bytes;
}

function strictHexToBytes(value: string) {
  if (value.length % 2 !== 0 || !/^[0-9a-fA-F]*$/u.test(value)) {
    throw new Error("invalid hex");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function binaryDraftToBase64(draft: LabBinaryDraft) {
  return draft.mode === "utf8" ? utf8ToBase64(draft.value) : hexToBase64(draft.value);
}

export function binaryDraftByteLength(draft: LabBinaryDraft) {
  try {
    return draft.mode === "utf8"
      ? new TextEncoder().encode(draft.value).byteLength
      : strictHexToBytes(draft.value).byteLength;
  } catch {
    return null;
  }
}

export function randomHex(byteLength: number, randomSource?: LabRandomSource) {
  return bytesToHex(randomBytes(byteLength, randomSource));
}

export function randomBase64URL(byteLength: number, randomSource?: LabRandomSource) {
  return bytesToBase64URL(randomBytes(byteLength, randomSource));
}

export function hexToBase64(value: string) {
  return bytesToBase64(strictHexToBytes(value));
}

export function base64ToHex(value: string) {
  return bytesToHex(strictBase64ToBytes(value));
}

export function hexToBase64URL(value: string) {
  return bytesToBase64URL(strictHexToBytes(value));
}

export function base64URLToHex(value: string) {
  return bytesToHex(strictBase64URLToBytes(value));
}

export function utf8ToBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value));
}

export function base64ToUTF8(value: string) {
  return new TextDecoder("utf-8", { fatal: true }).decode(strictBase64ToBytes(value));
}

export function isStrictBase64URL(value: string) {
  try {
    return strictBase64URLToBytes(value).byteLength > 0;
  } catch {
    return false;
  }
}

export function isHTTPOrigin(value: string) {
  if (!/^https?:\/\/[^/?#]+$/iu.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:")
      && url.username === ""
      && url.password === ""
      && url.pathname === "/"
      && url.search === ""
      && url.hash === "";
  } catch {
    return false;
  }
}

export function buildClientDataJSON(
  operation: LabClientDataOperation,
  clientData: Pick<LabClientDataDraft, "challenge" | "origin">,
) {
  return JSON.stringify({
    type: operation === "create" ? "webauthn.create" : "webauthn.get",
    challenge: clientData.challenge,
    origin: clientData.origin,
    crossOrigin: false,
  });
}

export function clientDataJSONText(
  operation: LabClientDataOperation,
  clientData: LabClientDataDraft,
) {
  return clientData.mode === "raw"
    ? clientData.rawJSON
    : buildClientDataJSON(operation, clientData);
}

export function clientDataJSONBase64(
  operation: LabClientDataOperation,
  clientData: LabClientDataDraft,
) {
  return utf8ToBase64(clientDataJSONText(operation, clientData));
}

function issue(
  field: string,
  code: LabValidationCode,
): LabValidationIssue {
  return { field, code };
}

function validateClientData(
  prefix: string,
  clientData: LabClientDataDraft,
  errors: LabValidationIssue[],
  warnings: LabValidationIssue[],
) {
  if (clientData.mode === "builder") {
    if (!clientData.origin) errors.push(issue(`${prefix}.origin`, "required"));
    else if (!isHTTPOrigin(clientData.origin)) errors.push(issue(`${prefix}.origin`, "invalid-origin"));

    if (!clientData.challenge) errors.push(issue(`${prefix}.challenge`, "required"));
    else if (!isStrictBase64URL(clientData.challenge)) {
      errors.push(issue(`${prefix}.challenge`, "invalid-base64url"));
    }
    return;
  }

  try {
    JSON.parse(clientData.rawJSON);
  } catch {
    warnings.push(issue(`${prefix}.rawJSON`, "invalid-json"));
  }
}

function validNonemptyHex(value: string) {
  if (!value) return false;
  try {
    return strictHexToBytes(value).byteLength > 0;
  } catch {
    return false;
  }
}

function validateDescriptors(
  prefix: string,
  descriptors: LabDescriptorDraft[],
  errors: LabValidationIssue[],
) {
  descriptors.forEach((descriptor, index) => {
    const field = `${prefix}.${index}.credentialIDHex`;
    if (!descriptor.credentialIDHex) errors.push(issue(field, "required"));
    else if (!validNonemptyHex(descriptor.credentialIDHex)) errors.push(issue(field, "invalid-hex"));
  });
}

function parseAlgorithm(value: string) {
  if (!/^[+-]?\d+$/u.test(value)) return null;
  const algorithm = Number(value);
  return Number.isSafeInteger(algorithm) && algorithm !== 0 ? algorithm : null;
}

function completeValidation(errors: LabValidationIssue[], warnings: LabValidationIssue[]): LabValidationResult {
  return { valid: errors.length === 0, errors, warnings };
}

export function validateMakeCredentialDraft(
  draft: MakeCredentialDraft,
  maxCredBlobLength?: number | null,
): LabValidationResult {
  const errors: LabValidationIssue[] = [];
  const warnings: LabValidationIssue[] = [];

  if (!draft.rpID) errors.push(issue("make.rpID", "required"));
  if (!draft.rpName) errors.push(issue("make.rpName", "required"));
  if (!draft.userIDHex) errors.push(issue("make.userIDHex", "required"));
  else if (!validNonemptyHex(draft.userIDHex)) errors.push(issue("make.userIDHex", "invalid-hex"));
  if (!draft.userName) errors.push(issue("make.userName", "required"));
  if (!draft.userDisplayName) errors.push(issue("make.userDisplayName", "required"));
  validateClientData("make.clientData", draft.clientData, errors, warnings);

  if (draft.algorithms.length === 0) errors.push(issue("make.algorithms", "required"));
  draft.algorithms.forEach((algorithm, index) => {
    if (parseAlgorithm(algorithm) === null) {
      errors.push(issue(`make.algorithms.${index}`, "invalid-algorithm"));
    }
  });
  validateDescriptors("make.excludeList", draft.excludeList, errors);
  validateMakeExtensions(draft, errors, maxCredBlobLength);

  return completeValidation(errors, warnings);
}

export function validateGetAssertionDraft(draft: GetAssertionDraft): LabValidationResult {
  const errors: LabValidationIssue[] = [];
  const warnings: LabValidationIssue[] = [];

  if (!draft.rpID) errors.push(issue("get.rpID", "required"));
  validateClientData("get.clientData", draft.clientData, errors, warnings);
  validateDescriptors("get.allowList", draft.allowList, errors);
  validateGetExtensions(draft, errors);

  return completeValidation(errors, warnings);
}

function validatePRFBinaryDraft(field: string, value: LabBinaryDraft, errors: LabValidationIssue[]) {
  if (binaryDraftByteLength(value) === null) errors.push(issue(field, "invalid-hex"));
}

function validateHMACSecret(
  prefix: string,
  value: MakeCredentialDraft["extensions"]["hmacSecretMC"],
  errors: LabValidationIssue[],
) {
  if (!value.included) return;
  if (!validNonemptyHex(value.salt1Hex)) errors.push(issue(`${prefix}.salt1Hex`, "invalid-hex"));
  else if (value.salt1Hex.length !== 64) errors.push(issue(`${prefix}.salt1Hex`, "invalid-length"));
  if (value.salt2Enabled) {
    if (!validNonemptyHex(value.salt2Hex)) errors.push(issue(`${prefix}.salt2Hex`, "invalid-hex"));
    else if (value.salt2Hex.length !== 64) errors.push(issue(`${prefix}.salt2Hex`, "invalid-length"));
  }
}

function validatePRFValues(prefix: string, value: MakeCredentialDraft["extensions"]["prf"]["eval"], errors: LabValidationIssue[]) {
  validatePRFBinaryDraft(`${prefix}.first`, value.first, errors);
  if (value.secondEnabled) validatePRFBinaryDraft(`${prefix}.second`, value.second, errors);
}

function validateMakeExtensions(
  draft: MakeCredentialDraft,
  errors: LabValidationIssue[],
  maxCredBlobLength?: number | null,
) {
  const extensions = draft.extensions;
  const prfConflict = extensions.prf.included && (
    (extensions.hmacSecret.included && !extensions.hmacSecret.value)
    || (extensions.hmacSecretMC.included && extensions.prf.useEval)
  );
  if (prfConflict) {
    errors.push(issue("make.extensions.hmac-prf", "extension-conflict"));
  }
  if (extensions.credentialBlob.included) {
    const byteLength = binaryDraftByteLength(extensions.credentialBlob.payload);
    if (byteLength === null) errors.push(issue("make.extensions.credBlob", "invalid-hex"));
    else if (maxCredBlobLength !== null && maxCredBlobLength !== undefined && byteLength > maxCredBlobLength) {
      errors.push(issue("make.extensions.credBlob", "too-long"));
    }
  }
  validateHMACSecret("make.extensions.hmacSecretMC", extensions.hmacSecretMC, errors);
  if (extensions.prf.included && extensions.prf.useEval) {
    validatePRFValues("make.extensions.prf", extensions.prf.eval, errors);
  }
}

function validateGetExtensions(draft: GetAssertionDraft, errors: LabValidationIssue[]) {
  const extensions = draft.extensions;
  const prfHasEvaluation = extensions.prf.useGlobalEval
    || extensions.prf.evalByCredential.length > 0;
  if (extensions.hmacSecret.included && extensions.prf.included && prfHasEvaluation) {
    errors.push(issue("get.extensions.hmac-prf", "extension-conflict"));
  }
  validateHMACSecret("get.extensions.hmacSecret", extensions.hmacSecret, errors);
  if (!extensions.prf.included) return;

  if (extensions.prf.useGlobalEval) validatePRFValues("get.extensions.prf.eval", extensions.prf.eval, errors);
  if (extensions.prf.evalByCredential.length > 0 && (
    extensions.prf.evalByCredential.length !== 1
    || draft.allowList.length !== 1
    || extensions.prf.evalByCredential.some((entry) => (
      entry.credentialIDHex.toLowerCase() !== draft.allowList[0].credentialIDHex.toLowerCase()
    ))
  )) {
    errors.push(issue(
      "get.extensions.prf.evalByCredential",
      "unsupported-prf-credential-selection",
    ));
  }
  extensions.prf.evalByCredential.forEach((entry, index) => {
    validatePRFValues(`get.extensions.prf.evalByCredential.${index}`, entry.values, errors);
  });
}

function triStateValue(value: LabTriState) {
  if (value === "auto") return undefined;
  return value === "true";
}

export function buildAuthenticatorOptions(draft: Pick<
  MakeCredentialDraft,
  "residentKey" | "userPresence" | "userVerification"
>) {
  const residentKey = triStateValue(draft.residentKey);
  const userPresence = triStateValue(draft.userPresence);
  const userVerification = triStateValue(draft.userVerification);
  if (residentKey === undefined && userPresence === undefined && userVerification === undefined) {
    return undefined;
  }
  return new AuthenticatorOptions({
    ...(residentKey === undefined ? {} : { residentKey }),
    ...(userPresence === undefined ? {} : { userPresence }),
    ...(userVerification === undefined ? {} : { userVerification }),
  });
}

function buildDescriptors(descriptors: LabDescriptorDraft[]) {
  return descriptors.map((descriptor) => new PublicKeyCredentialDescriptor({
    type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
    id: hexToBase64(descriptor.credentialIDHex),
    ...(descriptor.transports.length > 0 ? { transports: descriptor.transports } : {}),
  }));
}

function buildPRFValues(value: MakeCredentialDraft["extensions"]["prf"]["eval"]) {
  return new AuthenticationExtensionsPRFValues({
    first: binaryDraftToBase64(value.first),
    ...(value.secondEnabled ? { second: binaryDraftToBase64(value.second) } : {}),
  });
}

function buildMakeCredentialExtensions(draft: MakeCredentialDraft) {
  const source = draft.extensions;
  const included = Object.values(source).some((extension) => extension.included);
  if (!included) return undefined;

  return new CreateAuthenticationExtensionsClientInputs({
    ...(source.credentialProperties.included ? {
      credProps: true,
    } : {}),
    ...(source.credentialProtection.included ? {
      credentialProtectionPolicy: source.credentialProtection.policy,
      enforceCredentialProtectionPolicy: source.credentialProtection.enforce,
    } : {}),
    ...(source.credentialBlob.included ? {
      credBlob: binaryDraftToBase64(source.credentialBlob.payload),
    } : {}),
    ...(source.hmacSecret.included ? {
      hmacCreateSecret: source.hmacSecret.value,
    } : {}),
    ...(source.hmacSecretMC.included ? {
      hmacGetSecret: new HMACGetSecretInput({
        salt1: hexToBase64(source.hmacSecretMC.salt1Hex),
        ...(source.hmacSecretMC.salt2Enabled ? { salt2: hexToBase64(source.hmacSecretMC.salt2Hex) } : {}),
      }),
    } : {}),
    ...(source.minPINLength.included ? {
      minPinLength: source.minPINLength.value,
    } : {}),
    ...(source.pinComplexityPolicy.included ? {
      pinComplexityPolicy: source.pinComplexityPolicy.value,
    } : {}),
    ...(source.prf.included ? {
      prf: new AuthenticationExtensionsPRFInputs({
        ...(source.prf.useEval ? { eval: buildPRFValues(source.prf.eval) } : {}),
      }),
    } : {}),
  });
}

function buildGetAssertionExtensions(draft: GetAssertionDraft) {
  const source = draft.extensions;
  if (!source.getCredentialBlob.included && !source.hmacSecret.included && !source.prf.included) {
    return undefined;
  }

  return new GetAuthenticationExtensionsClientInputs({
    ...(source.getCredentialBlob.included ? {
      getCredBlob: source.getCredentialBlob.value,
    } : {}),
    ...(source.hmacSecret.included ? {
      hmacGetSecret: new HMACGetSecretInput({
        salt1: hexToBase64(source.hmacSecret.salt1Hex),
        ...(source.hmacSecret.salt2Enabled ? { salt2: hexToBase64(source.hmacSecret.salt2Hex) } : {}),
      }),
    } : {}),
    ...(source.prf.included ? {
      prf: new AuthenticationExtensionsPRFInputs({
        ...(source.prf.useGlobalEval ? { eval: buildPRFValues(source.prf.eval) } : {}),
        ...(source.prf.evalByCredential.length ? {
          evalByCredential: Object.fromEntries(source.prf.evalByCredential.map((entry) => [
            hexToBase64URL(entry.credentialIDHex),
            buildPRFValues(entry.values),
          ])),
        } : {}),
      }),
    } : {}),
  });
}

export function buildMakeCredentialRequest(
  sessionId: SessionID,
  draft: MakeCredentialDraft,
) {
  const excludeList = buildDescriptors(draft.excludeList);
  const options = buildAuthenticatorOptions(draft);
  const extensions = buildMakeCredentialExtensions(draft);
  const verificationFlow = draft.verificationFlow === VerificationFlow.VerificationFlowDefault
    ? undefined
    : draft.verificationFlow;

  return new MakeCredentialRequest({
    sessionId,
    ...(verificationFlow === undefined ? {} : { verificationFlow }),
    rp: new PublicKeyCredentialRpEntity({ id: draft.rpID, name: draft.rpName }),
    user: new PublicKeyCredentialUserEntity({
      id: hexToBase64(draft.userIDHex),
      name: draft.userName,
      displayName: draft.userDisplayName,
    }),
    clientDataJSON: clientDataJSONBase64("create", draft.clientData),
    pubKeyCredParams: draft.algorithms.map((algorithm) => new PublicKeyCredentialParameters({
      type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
      alg: parseAlgorithm(algorithm)!,
    })),
    ...(excludeList.length > 0 ? { excludeList } : {}),
    ...(options === undefined ? {} : { options }),
    ...(extensions === undefined ? {} : { extensions }),
  });
}

export function buildGetAssertionRequest(
  sessionId: SessionID,
  draft: GetAssertionDraft,
) {
  const allowList = buildDescriptors(draft.allowList);
  const options = buildAuthenticatorOptions(draft);
  const extensions = buildGetAssertionExtensions(draft);
  const verificationFlow = draft.verificationFlow === VerificationFlow.VerificationFlowDefault
    ? undefined
    : draft.verificationFlow;

  return new GetAssertionRequest({
    sessionId,
    ...(verificationFlow === undefined ? {} : { verificationFlow }),
    rpID: draft.rpID,
    clientDataJSON: clientDataJSONBase64("get", draft.clientData),
    ...(allowList.length > 0 ? { allowList } : {}),
    ...(options === undefined ? {} : { options }),
    ...(extensions === undefined ? {} : { extensions }),
  });
}
