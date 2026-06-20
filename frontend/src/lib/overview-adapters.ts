import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { OverviewBioSensorReport, OverviewInspectResult } from "./overview-types.js";
import { objectValue } from "./overview-utils.js";

export function overviewInspectResult(input: unknown): OverviewInspectResult | null {
  const result = objectValue(input);
  return result.device && result.info ? (result as unknown as OverviewInspectResult) : null;
}

export function overviewBioSensorReport(input: unknown): OverviewBioSensorReport | null {
  const report = objectValue(input);
  return report.device ? (report as unknown as OverviewBioSensorReport) : null;
}

export function overviewMDSResult(input: unknown): LookupResult | null {
  const result = objectValue(input);
  return result.aaguid || "found" in result ? (result as unknown as LookupResult) : null;
}
