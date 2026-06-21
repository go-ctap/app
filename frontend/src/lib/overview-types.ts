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

export type CtapFindingValue = {
  kind: "common" | "literal" | "input" | "list" | string;
  id?: "empty_list" | "extension_reported_command_missing" | "mutually_exclusive_support_reported" | "not_listed" | "not_reported" | string;
  value?: string;
  input?: unknown;
  items?: unknown[];
};

export type CtapConformanceFinding = {
  id: string;
  source: string;
  value: CtapFindingValue;
  args?: Record<string, unknown>;
};

export type OverviewInspectInfo = AuthenticatorGetInfoResponse & {
  uvModalityLabel?: string;
  conformanceFindings: CtapConformanceFinding[];
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

export type OverviewContext = {
  info?: OverviewInspectInfo | null;
  device?: DeviceReport | null;
  bioSensor?: OverviewBioSensorReport | null;
  mds?: LookupResult | null;
};

export type OverviewHeroContext = OverviewContext & {
  mdsLoading?: boolean;
  mdsError?: string | null;
  sessionLabel?: string;
};

export type MessageText = string | (() => string);
