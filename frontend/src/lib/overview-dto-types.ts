import type { Info as InspectInfo } from "../../bindings/github.com/go-ctap/kit/model/inspect";

export type InspectOptions = NonNullable<InspectInfo["options"]>;
export type InspectCertifications = NonNullable<InspectInfo["certifications"]>;
export type InspectAlgorithms = NonNullable<InspectInfo["algorithms"]>;

export type InspectNumberField =
  | "firmwareVersion"
  | "maxCredentialCountInList"
  | "maxCredentialIdLength"
  | "maxCredBlobLength"
  | "maxRPIDsForSetMinPINLength"
  | "maxSerializedLargeBlobArray"
  | "minPINLength"
  | "preferredPlatformUvAttempts"
  | "remainingDiscoverableCredentials"
  | "uvCountSinceLastPinEntry"
  | "uvModality";

export type InspectBooleanField =
  | "longTouchForReset"
  | "pinComplexityPolicy";
