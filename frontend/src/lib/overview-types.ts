import type { AuthenticatorGetInfoResponse } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";

export type OverviewRowStatus =
  | "supported"
  | "unsupported"
  | "configured"
  | "not configured"
  | "enabled"
  | "disabled"
  | "warning"
  | "unknown"
  | "informational";

export type OverviewRow = {
  group: string;
  name: string;
  description: string;
  status: OverviewRowStatus;
  value?: string;
  source?: string;
};

export type OverviewGroup = {
  name: string;
  rows: OverviewRow[];
};

export type OverviewConformanceWarning = {
  id?: string;
  name: string;
  description: string;
  value: string;
  source: string;
};

export type OverviewMDSObservationSeverity = "critical" | "warning" | "info";

export type OverviewMDSObservation = {
  severity: OverviewMDSObservationSeverity;
  finding: string;
  token: string;
  mds: string;
  source: string;
  description: string;
};

export type OverviewHeroSignalGroupId = "authentication" | "credentials-management";

export type OverviewHeroSignalId =
  | "up"
  | "clientPin"
  | "uv"
  | "pinUvAuthToken"
  | "alwaysUv"
  | "rk"
  | "credMgmt"
  | "largeBlobs"
  | "authnrCfg"
  | "setMinPINLength";

export type OverviewHeroSignal = {
  id: OverviewHeroSignalId;
  flag: string;
  title: string;
  value: string;
  valueNote?: string;
  status: OverviewRowStatus;
  statusLabel: string;
  tooltip: string;
};

export type OverviewHeroSignalGroup = {
  id: OverviewHeroSignalGroupId;
  title: string;
  signals: OverviewHeroSignal[];
};

export type OverviewHeroFactTone = "default" | "success" | "warning" | "error" | "muted";

export type OverviewHeroFact = {
  label: string;
  value: string;
  tone?: OverviewHeroFactTone;
  placeholder?: boolean;
  href?: string;
};

export type OverviewHeroModel = {
  title: string;
  subtitle: string;
  aaguid: string;
  aaguidAvailable: boolean;
  iconSrc: string;
  mdsState: "loading" | "found" | "missing" | "error" | "idle";
  mdsStateLabel: string;
  mdsDescription: string;
  mdsStatusFacts: OverviewHeroFact[];
  mdsBlobFacts: OverviewHeroFact[];
};

export type OverviewMDSLookupResult = {
  aaguid: string;
  found: boolean;
  entry?: OverviewMDSPayloadEntry | null;
  blobNumber: number;
  source: string;
  cached: boolean;
  cachedAt: string;
};

export type OverviewInspectInfo = AuthenticatorGetInfoResponse & {
  uvModalityLabel?: string;
};

export type OverviewInspectResult = {
  device: DeviceReport;
  info: OverviewInspectInfo;
};

export type OverviewBioSensorReport = {
  device: DeviceReport;
  supported: boolean;
  previewOnly: boolean;
  modality?: string | null;
  fingerprintKind?: string | null;
  maxCaptureSamplesRequiredForEnroll?: number | null;
  maxTemplateFriendlyName?: number | null;
};

export type OverviewMDSPayloadEntry = {
  aaid?: string | null;
  aaguid?: string;
  attestationCertificateKeyIdentifiers?: string[];
  metadataStatement?: OverviewMDSMetadataStatement;
  biometricStatusReports?: OverviewMDSBiometricStatusReport[];
  statusReports?: OverviewMDSStatusReport[];
  timeOfLastStatusChange?: string;
  rogueListURL?: string | null;
  rogueListHash?: string | null;
};

export type OverviewMDSAuthenticatorStatus =
  | "NOT_FIDO_CERTIFIED"
  | "FIDO_CERTIFIED"
  | "USER_VERIFICATION_BYPASS"
  | "ATTESTATION_KEY_COMPROMISE"
  | "USER_KEY_REMOTE_COMPROMISE"
  | "USER_KEY_PHYSICAL_COMPROMISE"
  | "UPDATE_AVAILABLE"
  | "RETIRED"
  | "REVOKED"
  | "SELF_ASSERTION_SUBMITTED"
  | "FIDO_CERTIFIED_L1"
  | "FIDO_CERTIFIED_L1plus"
  | "FIDO_CERTIFIED_L2"
  | "FIDO_CERTIFIED_L2plus"
  | "FIDO_CERTIFIED_L3"
  | "FIDO_CERTIFIED_L3plus"
  | "FIPS140_CERTIFIED_L1"
  | "FIPS140_CERTIFIED_L2"
  | "FIPS140_CERTIFIED_L3"
  | "FIPS140_CERTIFIED_L4";

export type OverviewMDSStatusReport = {
  status?: OverviewMDSAuthenticatorStatus | string;
  effectiveDate?: string | null;
  authenticatorVersion?: number | null;
  certificate?: string | null;
  url?: string | null;
  certificationDescriptor?: string | null;
  certificateNumber?: string | null;
  certificationPolicyVersion?: string | null;
  certificationProfiles?: string[];
  certificationRequirementsVersion?: string | null;
  sunsetDate?: string | null;
  fipsRevision?: number | null;
  fipsPhysicalSecurityLevel?: number | null;
};

export type OverviewMDSBiometricStatusReport = {
  certLevel?: number;
  modality?: string;
  effectiveDate?: string | null;
  certificationDescriptor?: string | null;
  certificateNumber?: string | null;
  certificationPolicyVersion?: string | null;
  certificationRequirementsVersion?: string | null;
};

export type OverviewMDSMetadataStatement = {
  legalHeader?: string | null;
  aaid?: string | null;
  aaguid?: string | null;
  attestationCertificateKeyIdentifiers?: string[];
  friendlyNames?: Record<string, string>;
  description?: string;
  alternativeDescriptions?: Record<string, string>;
  authenticatorVersion?: number | null;
  protocolFamily?: string;
  schema?: number;
  upv?: OverviewMDSVersion[];
  authenticationAlgorithms?: string[];
  publicKeyAlgAndEncodings?: string[];
  attestationTypes?: string[];
  userVerificationDetails?: unknown[];
  keyProtection?: string[];
  isKeyRestricted?: boolean | null;
  isFreshUserVerificationRequired?: boolean | null;
  matcherProtection?: string[];
  cryptoStrength?: number | null;
  attachmentHint?: string[];
  tcDisplay?: string[];
  tcDisplayContentType?: string | null;
  tcDisplayPNGCharacteristics?: OverviewMDSDisplayPNGCharacteristicsDescriptor[];
  attestationRootCertificates?: string[];
  ECDAATrustAnchor?: OverviewMDSECDAATrustAnchor[];
  icon?: string | null;
  iconDark?: string | null;
  providerLogoLight?: string | null;
  providerLogoDark?: string | null;
  extensionDescriptor?: OverviewMDSExtensionDescriptor[];
  multiDeviceCredentialSupport?: string | null;
  authenticatorGetInfo?: Record<string, unknown>;
  cxConfigURL?: string | null;
};

export type OverviewMDSVersion = {
  major?: number;
  minor?: number;
};

export type OverviewMDSDisplayPNGCharacteristicsDescriptor = {
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;
  compression?: number;
  filter?: number;
  interlace?: number;
  plte?: OverviewMDSRGBPaletteEntry[];
};

export type OverviewMDSRGBPaletteEntry = {
  r?: number | null;
  g?: number | null;
  b?: number | null;
};

export type OverviewMDSECDAATrustAnchor = {
  X?: string;
  Y?: string;
  c?: string;
  sx?: string;
  sy?: string;
  G1Curve?: string;
};

export type OverviewMDSExtensionDescriptor = {
  id?: string;
  tag?: number;
  data?: string;
  fail_if_unknown?: boolean;
};

export type OverviewContext = {
  info?: Partial<OverviewInspectInfo> | null;
  device?: Partial<DeviceReport> | null;
  bioSensor?: Partial<OverviewBioSensorReport> | null;
  mds?: Partial<LookupResult> | Partial<OverviewMDSLookupResult> | null;
};

export type OverviewHeroContext = OverviewContext & {
  mdsLoading?: boolean;
  mdsError?: string | null;
  sessionLabel?: string;
};

export type MessageText = string | (() => string);
