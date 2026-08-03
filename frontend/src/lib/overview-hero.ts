import type {
  LookupResult,
  MetadataStatement,
  PayloadEntry,
  StatusReport,
} from "../../bindings/github.com/go-ctap/mds/model";

import { deviceName as formattedDeviceName } from "$lib/format.js";
import { m, mdsDescriptionText, mdsStateText } from "$lib/overview-i18n.js";
import type {
  OverviewContext,
  OverviewHeroContext,
  OverviewHeroFact,
  OverviewHeroFactTone,
  OverviewHeroPresentation,
  OverviewMDSObservation,
  OverviewMDSState,
} from "$lib/overview-types.js";
import {
  formatAaguid,
  formatDateTime,
  mdsUrlLabel,
  safeMDSImage,
  textValue,
} from "$lib/overview-utils.js";

const DANGEROUS_MDS_STATUSES = new Set([
  "REVOKED",
  "USER_VERIFICATION_BYPASS",
  "ATTESTATION_KEY_COMPROMISE",
  "USER_KEY_REMOTE_COMPROMISE",
  "USER_KEY_PHYSICAL_COMPROMISE",
]);

type TextLike = string | number | boolean | null | undefined;

export function buildOverviewHero(context: OverviewHeroContext = {}): OverviewHeroPresentation {
  const info = context.info ?? null;
  const device = context.device ?? null;
  const mdsResult = context.mds ?? null;
  const entry = mdsResult?.entry ?? null;
  const statement = entry?.metadataStatement ?? null;
  const statusReports = entry?.statusReports ?? [];
  const latestStatus = statusReports.find((report) => !isFipsStatus(report.status)) ?? null;
  const rawAaguid = info?.aaguid || mdsResult?.aaguid;
  const aaguid = formatAaguid(rawAaguid);
  const deviceName = device ? formattedDeviceName(device) : "";
  const mdsName = preferredMDSName(statement);
  const found = mdsResult?.found === true;
  const hasLookup = Boolean(mdsResult);
  const status = textValue(latestStatus?.status, "");
  const mdsState = resolveMDSState(context, found, hasLookup);

  return {
    title: deviceName || mdsName || m.selected_authenticator(),
    subtitle: textValue(statement?.description, "") || m.current_authenticator_overview(),
    serialNumber: textValue(device?.identity?.serialNumber, ""),
    versionBadge: vendorVersionBadge(device),
    aaguid,
    aaguidAvailable: hasAaguid(rawAaguid, aaguid),
    iconSrc: safeMDSImage(statement?.icon) || safeMDSImage(statement?.iconDark) || "",
    mdsState,
    mdsStateLabel: mdsStateText(mdsState),
    mdsDescription: mdsDescriptionText(mdsState, context.mdsError),
    mdsStatusFacts: statusReportFacts(latestStatus, statement, entry, status, found, mdsState),
    mdsBlobFacts: metadataBlobFacts(mdsResult, hasLookup),
  };
}

function vendorVersionBadge(device: OverviewHeroContext["device"]) {
  const token2Release = device?.vendorMetadata?.token2?.release;

  if (token2Release) {
    return m.token_release_badge({ version: token2Release.slice(1) });
  }

  const yubicoVersion = device?.vendorMetadata?.yubico?.firmwareVersion;

  if (yubicoVersion && (yubicoVersion.major || yubicoVersion.minor || yubicoVersion.build)) {
    return m.token_firmware_badge({
      version: `${yubicoVersion.major}.${yubicoVersion.minor}.${yubicoVersion.build}`,
    });
  }

  return "";
}

export function buildOverviewMDSObservations(
  context: OverviewContext = {},
): OverviewMDSObservation[] {
  const latest = context.mds?.entry?.statusReports?.[0] ?? null;
  const status = textValue(latest?.status, "");

  if (!status || !DANGEROUS_MDS_STATUSES.has(status)) return [];

  return [
    {
      severity: "critical",
      finding: m.mds_observation_status_report_critical_finding(),
      token: m.not_reported(),
      mds: formatStatusReport(latest),
      source: "entry.statusReports[0]",
      description: m.mds_observation_status_report_critical_description(),
    },
  ];
}

function resolveMDSState(
  context: OverviewHeroContext,
  found: boolean,
  hasLookup: boolean,
): OverviewMDSState {
  if (context.mdsLoading) return "loading";

  if (context.mdsError) return "error";

  if (found) return "found";

  return hasLookup ? "missing" : "idle";
}

function heroFact(
  label: string,
  factValue: string,
  tone: OverviewHeroFactTone = "default",
  placeholder = false,
  href = "",
): OverviewHeroFact {
  return {
    label,
    value: factValue || m.mds_placeholder(),
    tone,
    placeholder,
    ...(href ? { href } : {}),
  };
}

function optionalHeroFact(
  label: string,
  input: TextLike,
  found: boolean,
  options: { href?: string; tone?: OverviewHeroFactTone } = {},
) {
  if (!found) return null;

  const text = textValue(input, "");

  return text ? heroFact(label, text, options.tone || "default", false, options.href) : null;
}

function fipsCertificationFact(statement: MetadataStatement | null, found: boolean) {
  const certifications = statement?.authenticatorGetInfo?.certifications ?? {};
  const fipsCertifications = Object.entries(certifications)
    .filter(([id]) => id.toUpperCase().startsWith("FIPS-"))
    .map(([id, level]) => `${id}: L${level}`);

  return heroFact(
    m.mds_fips_validation(),
    fipsCertifications.length ? fipsCertifications.join("\n") : m.not_reported(),
    fipsCertifications.length ? "success" : "muted",
    !found,
  );
}

function preferredMDSName(statement: MetadataStatement | null) {
  const names = statement?.friendlyNames ?? {};

  return (
    textValue(names["en-US"], "") ||
    textValue(names.en, "") ||
    textValue(Object.values(names).find(Boolean), "") ||
    textValue(statement?.description, "")
  );
}

function statusReportFacts(
  latestStatus: StatusReport | null,
  statement: MetadataStatement | null,
  entry: PayloadEntry | null,
  status: string,
  found: boolean,
  mdsState: OverviewMDSState,
) {
  return [
    heroFact(
      m.mds_fido_validation(),
      mdsText(status, found),
      mdsState === "found" ? statusTone(status) : "muted",
      !found,
    ),
    fipsCertificationFact(statement, found),
    heroFact(
      m.mds_effective_date(),
      mdsText(latestStatus?.effectiveDate, found),
      found ? "default" : "muted",
      !found,
    ),
    heroFact(
      m.mds_last_status_change(),
      mdsText(entry?.timeOfLastStatusChange, found),
      found ? "default" : "muted",
      !found,
    ),
    optionalHeroFact(m.mds_certificate_number(), latestStatus?.certificateNumber, found),
    optionalHeroFact(m.mds_sunset_date(), latestStatus?.sunsetDate, found),
    optionalHeroFact(m.mds_status_url(), mdsUrlLabel(latestStatus?.url), found, {
      href: externalUrl(latestStatus?.url),
    }),
  ].filter((fact): fact is OverviewHeroFact => Boolean(fact));
}

function metadataBlobFacts(result: LookupResult | null, hasLookup: boolean) {
  const sourceUrl = externalUrl(result?.source);

  return [
    heroFact(
      m.source(),
      mdsSourceText(result?.source, hasLookup),
      hasLookup ? "default" : "muted",
      !hasLookup,
      sourceUrl,
    ),
    heroFact(
      m.mds_blob_number(),
      mdsText(result?.blobNumber, hasLookup),
      hasLookup ? "default" : "muted",
      !hasLookup,
    ),
    heroFact(
      m.mds_blob_load(),
      mdsBlobLoadText(result, hasLookup),
      hasLookup ? "default" : "muted",
      !hasLookup,
    ),
    heroFact(
      m.mds_snapshot_saved(),
      mdsCachedAtText(result, hasLookup),
      hasLookup ? "default" : "muted",
      !hasLookup,
    ),
  ];
}

function mdsSourceText(input: string | null | undefined, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();

  return mdsUrlLabel(input) || m.not_reported();
}

function mdsBlobLoadText(result: LookupResult | null, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();

  if (result?.cached === true) return m.mds_blob_source_cached();

  if (result?.cached === false) return m.mds_blob_source_fetched();

  return m.not_reported();
}

function mdsCachedAtText(result: LookupResult | null, hasLookup: boolean) {
  if (!hasLookup) return m.mds_placeholder();

  return formatDateTime(result?.cachedAt) || m.not_reported();
}

function mdsText(input: TextLike, available: boolean) {
  return textValue(input, available ? m.not_reported() : m.mds_placeholder());
}

function externalUrl(input: string | null | undefined) {
  const text = textValue(input, "");

  if (!text) return "";

  try {
    const url = new URL(text);

    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function hasAaguid(rawAaguid: TextLike, formattedAaguid: string) {
  return textValue(rawAaguid, "").trim().length > 0 && formattedAaguid !== m.not_reported();
}

function statusTone(input: string): OverviewHeroFactTone {
  const status = input.toUpperCase();

  if (!status) return "muted";

  if (
    status.includes("REVOKED") ||
    status.includes("USER_VERIFICATION_BYPASS") ||
    status.includes("ATTESTATION_KEY_COMPROMISE")
  )
    return "error";

  if (
    status.includes("UPDATE_AVAILABLE") ||
    status.includes("NOT_FIDO_CERTIFIED") ||
    status.includes("RETIRED") ||
    status.includes("SELF_ASSERTION_SUBMITTED")
  )
    return "warning";

  if (status.includes("FIDO_CERTIFIED") || status.includes("FIPS140_CERTIFIED")) return "success";

  return "default";
}

function isFipsStatus(input: string) {
  return input.toUpperCase().startsWith("FIPS140_CERTIFIED_");
}

function formatStatusReport(statusReport: StatusReport | null) {
  if (!statusReport) return m.not_reported();

  const status = textValue(statusReport.status, m.not_reported());
  const version = textValue(statusReport.authenticatorVersion, "");

  return version ? `${status} @ ${version}` : status;
}
