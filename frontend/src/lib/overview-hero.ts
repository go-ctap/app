import { m, mdsDescriptionText, mdsStateText } from "./overview-i18n.js";
import type {
  OverviewContext,
  OverviewHeroContext,
  OverviewHeroFact,
  OverviewHeroFactTone,
  OverviewHeroModel,
  OverviewMDSLookupResult,
  OverviewMDSMetadataStatement,
  OverviewMDSObservation,
  OverviewMDSObservationSeverity,
  OverviewMDSPayloadEntry,
  OverviewMDSStatusReport,
} from "./overview-types.js";
import { arrayValue, formatAaguid, formatDateTime, hasOwn, mdsUrlLabel, objectValue, safeMDSImage, textValue } from "./overview-utils.js";

const DANGEROUS_MDS_STATUSES = new Set([
  "REVOKED",
  "USER_VERIFICATION_BYPASS",
  "ATTESTATION_KEY_COMPROMISE",
  "USER_KEY_REMOTE_COMPROMISE",
  "USER_KEY_PHYSICAL_COMPROMISE",
]);

export function buildOverviewHero(context: OverviewHeroContext = {}): OverviewHeroModel {
  const info = objectValue(context.info);
  const device = objectValue(context.device);
  const mdsResult = mdsLookupResult(context.mds);
  const entry = mdsPayloadEntry(mdsResult.entry);
  const statement = mdsMetadataStatement(entry.metadataStatement);
  const latestStatus = mdsStatusReport(arrayValue(entry.statusReports)[0]);
  const rawAaguid = info.aaguid ?? mdsResult.aaguid;
  const aaguid = formatAaguid(rawAaguid);
  const deviceName = [device.manufacturer, device.product].filter(Boolean).join(" ") || textValue(device.product, "");
  const mdsName = preferredMDSName(statement);
  const found = mdsResult.found === true;
  const hasLookup = hasLookupResult(mdsResult);
  const status = textValue(latestStatus.status, "");
  const mdsState = resolveMDSState(context, mdsResult, found, hasLookup);

  return {
    title: deviceName || mdsName || m.selected_authenticator(),
    subtitle: textValue(statement.description, "") || m.current_authenticator_overview(),
    aaguid,
    aaguidAvailable: hasAaguid(rawAaguid, aaguid),
    iconSrc: safeMDSImage(statement.icon) || safeMDSImage(statement.iconDark) || "",
    mdsState,
    mdsStateLabel: mdsStateText(mdsState),
    mdsDescription: mdsDescriptionText(mdsState, context.mdsError),
    mdsStatusFacts: statusReportFacts(latestStatus, entry, status, found, mdsState),
    mdsBlobFacts: metadataBlobFacts(mdsResult, hasLookup),
  };
}

export function buildOverviewMDSObservations(context: OverviewContext = {}): OverviewMDSObservation[] {
  const mdsResult = mdsLookupResult(context.mds);
  const entry = mdsPayloadEntry(mdsResult.entry);
  const statusReports = arrayValue(entry.statusReports).map(mdsStatusReport);
  const latest = statusReports[0];
  const status = textValue(latest?.status, "");
  if (!status || !DANGEROUS_MDS_STATUSES.has(status)) return [];

  return [mdsObservation(
    "critical",
    m.mds_observation_status_report_critical_finding(),
    m.not_reported(),
    formatStatusReport(latest),
    "entry.statusReports[0]",
    m.mds_observation_status_report_critical_description(),
  )];
}

function mdsLookupResult(input: unknown) {
  return objectValue(input) as Partial<OverviewMDSLookupResult> & Record<string, unknown>;
}

function mdsPayloadEntry(input: unknown) {
  return objectValue(input) as OverviewMDSPayloadEntry & Record<string, unknown>;
}

function mdsMetadataStatement(input: unknown) {
  return objectValue(input) as OverviewMDSMetadataStatement & Record<string, unknown>;
}

function mdsStatusReport(input: unknown) {
  return objectValue(input) as OverviewMDSStatusReport & Record<string, unknown>;
}

function hasLookupResult(result: Record<string, unknown>) {
  return hasOwn(result, "found") || hasOwn(result, "blobNumber") || hasOwn(result, "source") || hasOwn(result, "cached") || hasOwn(result, "cachedAt");
}

function resolveMDSState(
  context: OverviewHeroContext,
  _mdsResult: Record<string, unknown>,
  found: boolean,
  hasLookup: boolean,
): OverviewHeroModel["mdsState"] {
  if (context.mdsLoading) return "loading";
  if (context.mdsError) return "error";
  if (found) return "found";
  return hasLookup ? "missing" : "idle";
}

function heroFact(label: string, factValue: string, tone: OverviewHeroFactTone = "default", placeholder = false, href = ""): OverviewHeroFact {
  return {
    label,
    value: factValue || m.mds_placeholder(),
    tone,
    placeholder,
    ...(href ? { href } : {}),
  };
}

function optionalHeroFact(label: string, input: unknown, found: boolean, options: { href?: string; tone?: OverviewHeroFactTone } = {}) {
  if (!found) return null;
  const text = textValue(input, "");
  return text ? heroFact(label, text, options.tone || "default", false, options.href) : null;
}

function fipsHeroFacts(statusReport: OverviewMDSStatusReport, status: string, found: boolean) {
  if (!found || !isFipsStatus(status)) return [];
  return [
    optionalHeroFact(m.mds_fips_revision(), statusReport.fipsRevision, found),
    optionalHeroFact(m.mds_fips_physical_security_level(), statusReport.fipsPhysicalSecurityLevel, found),
  ].filter((fact): fact is OverviewHeroFact => Boolean(fact));
}

function preferredMDSName(statement: OverviewMDSMetadataStatement & Record<string, unknown>) {
  const names = objectValue(statement.friendlyNames);
  return textValue(names["en-US"], "") || textValue(names.en, "") || textValue(Object.values(names)[0], "") || textValue(statement.description, "");
}

function statusReportFacts(
  latestStatus: OverviewMDSStatusReport,
  entry: OverviewMDSPayloadEntry,
  status: string,
  found: boolean,
  mdsState: OverviewHeroModel["mdsState"],
) {
  return [
    heroFact(m.mds_status(), mdsText(status, found), mdsState === "found" ? statusTone(status) : "muted", !found),
    heroFact(m.mds_effective_date(), mdsText(latestStatus.effectiveDate, found), found ? "default" : "muted", !found),
    heroFact(m.mds_last_status_change(), mdsText(entry.timeOfLastStatusChange, found), found ? "default" : "muted", !found),
    optionalHeroFact(m.mds_certificate_number(), latestStatus.certificateNumber, found),
    optionalHeroFact(m.mds_sunset_date(), latestStatus.sunsetDate, found),
    optionalHeroFact(m.mds_status_url(), mdsUrlLabel(latestStatus.url), found, { href: externalUrl(latestStatus.url) }),
    ...fipsHeroFacts(latestStatus, status, found),
  ].filter((fact): fact is OverviewHeroFact => Boolean(fact));
}

function metadataBlobFacts(result: Partial<OverviewMDSLookupResult>, hasLookup: boolean) {
  const sourceUrl = externalUrl(result.source);
  return [
    heroFact(m.source(), mdsSourceText(result.source, hasLookup), hasLookup ? "default" : "muted", !hasLookup, sourceUrl),
    heroFact(m.mds_blob_number(), mdsText(result.blobNumber, hasLookup), hasLookup ? "default" : "muted", !hasLookup),
    heroFact(m.mds_blob_load(), mdsBlobLoadText(result, hasLookup), hasLookup ? "default" : "muted", !hasLookup),
    heroFact(m.mds_snapshot_saved(), mdsCachedAtText(result, hasLookup), hasLookup ? "default" : "muted", !hasLookup),
  ];
}

function mdsSourceText(input: unknown, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();
  return mdsUrlLabel(input) || m.not_reported();
}

function mdsBlobLoadText(result: Partial<OverviewMDSLookupResult>, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();
  if (result.cached === true) return m.mds_blob_source_cached();
  if (result.cached === false) return m.mds_blob_source_fetched();
  return m.not_reported();
}

function mdsCachedAtText(result: Partial<OverviewMDSLookupResult>, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();
  return formatDateTime(result.cachedAt) || m.not_reported();
}

function mdsText(input: unknown, available: boolean) {
  return textValue(input, available ? m.not_reported() : m.mds_placeholder());
}

function externalUrl(input: unknown) {
  const text = textValue(input, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function hasAaguid(rawAaguid: unknown, formattedAaguid: string) {
  return textValue(rawAaguid, "").trim().length > 0 && formattedAaguid !== m.not_reported();
}

function statusTone(input: unknown): OverviewHeroFactTone {
  const status = String(input || "").toUpperCase();
  if (!status) return "muted";
  if (status.includes("REVOKED") || status.includes("USER_VERIFICATION_BYPASS") || status.includes("ATTESTATION_KEY_COMPROMISE")) return "error";
  if (status.includes("UPDATE_AVAILABLE") || status.includes("NOT_FIDO_CERTIFIED") || status.includes("RETIRED") || status.includes("SELF_ASSERTION_SUBMITTED")) return "warning";
  if (status.includes("FIDO_CERTIFIED") || status.includes("FIPS140_CERTIFIED")) return "success";
  return "default";
}

function isFipsStatus(input: unknown) {
  return String(input || "").toUpperCase().startsWith("FIPS140_CERTIFIED_");
}

function formatStatusReport(statusReport: OverviewMDSStatusReport | undefined) {
  if (!statusReport) return m.not_reported();
  const status = textValue(statusReport.status, m.not_reported());
  const version = textValue(statusReport.authenticatorVersion, "");
  return version ? `${status} @ ${version}` : status;
}

function mdsObservation(severity: OverviewMDSObservationSeverity, finding: string, token: string, metadata: string, source: string, description: string): OverviewMDSObservation {
  return { severity, finding, token, mds: metadata, source, description };
}
