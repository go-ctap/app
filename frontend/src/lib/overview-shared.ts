import { m, overviewGroupLabel, overviewStatusLabel as localizedStatusLabel } from "./overview-i18n.js";
import type { MessageText, OverviewGroup, OverviewRow, OverviewRowStatus } from "./overview-types.js";

export const GROUP_ORDER = ["Identity", "Interfaces", "Protocol", "Verification", "Storage", "Management", "Policy", "Extensions", "Limits", "Attestation"] as const;

export function resolveText(text: MessageText) {
  return typeof text === "function" ? text() : text;
}

export function row(group: string, name: MessageText, description: MessageText, status: OverviewRowStatus, value?: string, source?: string): OverviewRow {
  return {
    group,
    name: resolveText(name),
    description: resolveText(description),
    status,
    ...(value === undefined ? {} : { value }),
    ...(source === undefined ? {} : { source }),
  };
}

export function groupOverviewRows(rows: OverviewRow[]): OverviewGroup[] {
  return GROUP_ORDER.map((name) => ({ name: overviewGroupLabel(name), rows: rows.filter((row) => row.group === name) })).filter(({ rows }) => rows.length > 0);
}

export function overviewStatusLabel(status: OverviewRowStatus) {
  return localizedStatusLabel(status);
}

export function overviewRowSupported(row: OverviewRow) {
  return row.status === "supported" || row.status === "configured" || row.status === "enabled";
}

export function overviewRowKnown(row: OverviewRow) {
  return row.status !== "unknown" && row.status !== "informational";
}

export function groupSummary(rows: OverviewRow[]) {
  const warnings = rows.filter((row) => row.status === "warning").length;
  if (warnings) return m.warnings_count({ count: warnings });

  const known = rows.filter(overviewRowKnown);
  const supported = known.filter(overviewRowSupported);
  return known.length ? m.active_ratio({ supported: supported.length, total: known.length }) : m.reported_values();
}
