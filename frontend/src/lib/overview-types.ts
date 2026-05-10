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
  iconSrc: string;
  mdsState: "loading" | "found" | "missing" | "error" | "idle";
  mdsStateLabel: string;
  mdsDescription: string;
  mdsBlobSource: string;
  mdsSnapshotSaved: string;
  mdsBlobNumber: string;
  mdsFacts: OverviewHeroFact[];
};

export type OverviewContext = {
  info?: Record<string, unknown> | null;
  device?: Record<string, unknown> | null;
  bioSensor?: Record<string, unknown> | null;
  mds?: Record<string, unknown> | null;
};

export type OverviewHeroContext = OverviewContext & {
  mdsLoading?: boolean;
  mdsError?: string | null;
  sessionLabel?: string;
};

export type MessageText = string | (() => string);
