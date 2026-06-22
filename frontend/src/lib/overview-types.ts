import type { InspectInfo } from "../../bindings/github.com/go-ctap/kit/model";
import type { BioSensorReport } from "../../bindings/github.com/go-ctap/kit/model/config";
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

export type OverviewMDSState = "loading" | "found" | "missing" | "error" | "idle";

export type OverviewHeroFact = {
  label: string;
  value: string;
  tone?: OverviewHeroFactTone;
  placeholder?: boolean;
  href?: string;
};

export type OverviewHeroPresentation = {
  title: string;
  subtitle: string;
  aaguid: string;
  aaguidAvailable: boolean;
  iconSrc: string;
  mdsState: OverviewMDSState;
  mdsStateLabel: string;
  mdsDescription: string;
  mdsStatusFacts: OverviewHeroFact[];
  mdsBlobFacts: OverviewHeroFact[];
};

export type OverviewContext = {
  info?: InspectInfo | null;
  device?: DeviceReport | null;
  bioSensor?: BioSensorReport | null;
  mds?: LookupResult | null;
};

export type OverviewHeroContext = OverviewContext & {
  mdsLoading?: boolean;
  mdsError?: string | null;
  sessionLabel?: string;
};

export type MessageText = string | (() => string);
