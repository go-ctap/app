import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { BioSensorEnvelope, InspectEnvelope } from "../../bindings/fidobench/service";

import { m } from "../paraglide/messages.js";
import { bioSensorReport, inspectResult } from "./ctapkit-results.js";
import type { LoadState } from "./features/overview/state.js";
import {
  buildOverviewConformancePresentation,
  buildOverviewHero,
  buildOverviewHeroSignalGroups,
  buildOverviewMDSObservations,
  buildOverviewRows,
  groupOverviewRows,
} from "./overview-rules.js";

export type OverviewPresentationInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  overviewState: LoadState<InspectEnvelope>;
  overviewBioSensorState: LoadState<BioSensorEnvelope>;
  overviewMDSState: LoadState<LookupResult | null>;
};

export type OverviewPresentation = ReturnType<typeof buildOverviewPresentation>;

export function buildOverviewPresentation(input: OverviewPresentationInput) {
  const selector = input.selectedSelector;
  const envelope = input.overviewState.data;
  const loading = input.overviewState.state === "loading";
  const mdsLoading = input.overviewMDSState.state === "loading";
  const mdsFailureMessage = input.overviewMDSState.state === "error" ? m.mds_unavailable_description() : null;
  const report = inspectResult(envelope);
  const info = report?.info;
  const device = report?.device || input.selectedDevice;
  const mdsResult = input.overviewMDSState.data ?? null;
  const bioSensor = bioSensorReport(input.overviewBioSensorState.data);
  const overviewRows = buildOverviewRows({ info, device, bioSensor });

  return {
    selector,
    loading,
    mdsLoading,
    hasReport: Boolean(report),
    report,
    info,
    hero: buildOverviewHero({ info, device, mds: mdsResult, mdsLoading, mdsError: mdsFailureMessage }),
    signalGroups: buildOverviewHeroSignalGroups({ info }),
    overviewGroups: groupOverviewRows(overviewRows),
    conformance: buildOverviewConformancePresentation({ info }),
    mdsObservations: buildOverviewMDSObservations({ info, mds: mdsResult }),
    warningCount: overviewRows.filter((row) => row.status === "warning").length,
  };
}
