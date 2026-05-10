import { localizeCtapWarning } from "./overview-i18n.js";
import type { OverviewConformanceWarning, OverviewContext } from "./overview-types.js";
import { buildCtap23ConformanceFindings } from "./overview-ctap23.js";

export function buildOverviewConformanceWarnings(context: OverviewContext = {}): OverviewConformanceWarning[] {
  return buildCtap23ConformanceFindings(context).map(localizeCtapWarning);
}
