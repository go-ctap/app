import { m, mdsDescriptionText, mdsStateText } from "./overview-i18n.js";
import type { OverviewContext, OverviewHeroContext, OverviewHeroFact, OverviewHeroFactTone, OverviewHeroModel, OverviewMDSObservation, OverviewMDSObservationSeverity } from "./overview-types.js";
import { arrayValue, formatAaguid, formatDateTime, formatMap, mdsUrlLabel, objectValue, safeMDSImage, textValue } from "./overview-utils.js";

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
  const mdsResult = objectValue(context.mds);
  const entry = objectValue(mdsResult.entry);
  const statement = objectValue(entry.metadataStatement);
  const latestStatus = objectValue(arrayValue(entry.statusReports)[0]);
  const certifications = objectValue(info.certifications);
  const mdsCertifications = objectValue(statement.certifications);
  const aaguid = formatAaguid(info.aaguid);
  const deviceName = [device.manufacturer, device.product].filter(Boolean).join(" ") || textValue(device.product, "");
  const mdsName = preferredMDSName(statement);
  const found = mdsResult.found === true;
  const status = textValue(latestStatus.status, "");
  const mdsState = resolveMDSState(context, mdsResult, found);

  return {
    title: deviceName || mdsName || m.selected_authenticator(),
    subtitle: textValue(statement.description, "") || m.current_authenticator_overview(),
    aaguid,
    iconSrc: safeMDSImage(statement.icon) || safeMDSImage(statement.iconDark) || "",
    mdsState,
    mdsStateLabel: mdsStateText(mdsState),
    mdsDescription: mdsDescriptionText(mdsState, context.mdsError),
    mdsBlobSource: mdsBlobSourceText(mdsResult, found),
    mdsSnapshotSaved: mdsSnapshotSavedText(mdsResult, found),
    mdsBlobNumber: mdsText(mdsResult.blobNumber, found),
    mdsFacts: [
      heroFact(m.mds_status(), mdsText(status, found), mdsState === "found" ? statusTone(status) : "muted", !found),
      heroFact(m.mds_certification(), certificationSummary(mdsCertifications, certifications, found), found ? "default" : "muted", !found),
      heroFact(m.mds_effective_date(), mdsText(latestStatus.effectiveDate, found), found ? "default" : "muted", !found),
      heroFact(m.mds_last_status_change(), mdsText(entry.timeOfLastStatusChange, found), found ? "default" : "muted", !found),
      heroFact(m.mds_certificate_number(), mdsText(latestStatus.certificateNumber, found), found ? "default" : "muted", !found),
      heroFact(m.mds_policy_version(), mdsText(latestStatus.certificationPolicyVersion, found), found ? "default" : "muted", !found),
      heroFact(m.mds_requirements_version(), mdsText(latestStatus.certificationRequirementsVersion, found), found ? "default" : "muted", !found),
      optionalHeroFact(m.mds_sunset_date(), latestStatus.sunsetDate, found),
      optionalHeroFact(m.mds_status_url(), mdsUrlLabel(latestStatus.url), found, { href: textValue(latestStatus.url, "") }),
      ...fipsHeroFacts(latestStatus, status, found),
    ].filter((fact): fact is OverviewHeroFact => Boolean(fact)),
  };
}

export function buildOverviewMDSObservations(context: OverviewContext = {}): OverviewMDSObservation[] {
  const mdsResult = objectValue(context.mds);
  const entry = objectValue(mdsResult.entry);
  const statusReports = arrayValue(entry.statusReports).map(objectValue);
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

function resolveMDSState(context: OverviewHeroContext, mdsResult: Record<string, unknown>, found: boolean): OverviewHeroModel["mdsState"] {
  if (context.mdsLoading) return "loading";
  if (context.mdsError) return "error";
  if (found) return "found";
  return Object.keys(mdsResult).length ? "missing" : "idle";
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

function fipsHeroFacts(statusReport: Record<string, unknown>, status: string, found: boolean) {
  if (!found || !isFipsStatus(status)) return [];
  return [
    heroFact(m.mds_fips_revision(), mdsText(statusReport.fipsRevision, found), "default", false),
    heroFact(m.mds_fips_physical_security_level(), mdsText(statusReport.fipsPhysicalSecurityLevel, found), "default", false),
  ];
}

function preferredMDSName(statement: Record<string, unknown>) {
  const names = objectValue(statement.friendlyNames);
  return textValue(names["en-US"], "") || textValue(names.en, "") || textValue(Object.values(names)[0], "") || textValue(statement.description, "");
}

function mdsBlobSourceText(result: Record<string, unknown>, found: boolean) {
  if (!found) return m.mds_placeholder();
  return result.cached === true ? m.mds_blob_source_cached() : m.mds_blob_source_fetched();
}

function mdsSnapshotSavedText(result: Record<string, unknown>, found: boolean) {
  if (!found) return m.mds_placeholder();
  return formatDateTime(result.cachedAt) || m.not_reported();
}

function mdsText(input: unknown, found: boolean) {
  return textValue(input, found ? m.not_reported() : m.mds_placeholder());
}

function certificationSummary(primary: Record<string, unknown>, fallback: Record<string, unknown>, found: boolean) {
  const source = Object.keys(primary).length ? primary : fallback;
  if (!Object.keys(source).length) return found ? m.not_reported() : m.mds_placeholder();
  return formatMap(source);
}

function statusTone(input: unknown): OverviewHeroFactTone {
  const status = String(input || "").toUpperCase();
  if (!status) return "muted";
  if (status.includes("REVOKED") || status.includes("USER_VERIFICATION_BYPASS") || status.includes("ATTESTATION_KEY_COMPROMISE")) return "error";
  if (status.includes("UPDATE_AVAILABLE") || status.includes("NOT_FIDO_CERTIFIED")) return "warning";
  if (status.includes("FIDO_CERTIFIED")) return "success";
  return "default";
}

function isFipsStatus(input: unknown) {
  return String(input || "").toUpperCase().startsWith("FIPS140_CERTIFIED_");
}

function formatStatusReport(statusReport: Record<string, unknown> | undefined) {
  if (!statusReport) return m.not_reported();
  const status = textValue(statusReport.status, m.not_reported());
  const version = textValue(statusReport.authenticatorVersion, "");
  return version ? `${status} @ ${version}` : status;
}

function mdsObservation(severity: OverviewMDSObservationSeverity, finding: string, token: string, metadata: string, source: string, description: string): OverviewMDSObservation {
  return { severity, finding, token, mds: metadata, source, description };
}
