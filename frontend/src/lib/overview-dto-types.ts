import type { PublicKeyCredentialParameters } from "../../bindings/github.com/go-ctap/ctap/credential";
import type { Option } from "../../bindings/github.com/go-ctap/ctap/protocol";

export type InspectOptions = { [_ in Option]?: boolean };
export type InspectCertifications = { [_ in string]?: number };
export type InspectAlgorithms = PublicKeyCredentialParameters[];

export type InspectNumberField =
  | "firmwareVersion"
  | "maxCredentialCountInList"
  | "maxCredentialIdLength"
  | "preferredPlatformUvAttempts"
  | "remainingDiscoverableCredentials"
  | "uvCountSinceLastPinEntry"
  | "uvModality";

export type InspectBooleanField =
  | "longTouchForReset"
  | "pinComplexityPolicy";
