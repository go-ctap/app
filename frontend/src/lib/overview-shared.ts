import {
  overviewGroupLabel,
  overviewStatusLabel as localizedStatusLabel,
} from "$lib/overview-i18n.js";
import type {
  MessageText,
  OverviewGroup,
  OverviewRow,
  OverviewRowStatus,
} from "$lib/overview-types.js";

export const GROUP_ORDER = [
  "Identity",
  "Interfaces",
  "Vendor",
  "Protocol",
  "Verification",
  "Storage",
  "Management",
  "Policy",
  "Extensions",
  "Limits",
  "Attestation",
] as const;

export function resolveText(text: MessageText) {
  return typeof text === "function" ? text() : text;
}

export function row(
  group: string,
  name: MessageText,
  description: MessageText,
  status: OverviewRowStatus,
  value?: string,
  source?: string,
): OverviewRow {
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
  return GROUP_ORDER.map((name) => ({
    name: overviewGroupLabel(name),
    rows: rows.filter((row) => row.group === name),
  })).filter(({ rows }) => rows.length > 0);
}

export function overviewStatusLabel(status: OverviewRowStatus) {
  return localizedStatusLabel(status);
}
