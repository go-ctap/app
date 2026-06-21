import { localizeCtapWarning } from "./overview-i18n.js";
import type { OverviewConformanceWarning, OverviewContext } from "./overview-types.js";

export function buildOverviewConformanceWarnings(context: OverviewContext = {}): OverviewConformanceWarning[] {
  if (!context.info) return [];

  return context.info.conformanceFindings.map(localizeCtapWarning);
}
