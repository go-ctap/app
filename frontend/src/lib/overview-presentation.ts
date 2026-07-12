import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { BioSensorEnvelope, InspectEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { bioSensorReport, inspectResult, operationError } from "./ctapkit-results.js";
import type { LoadState } from "./features/overview/state.js";
import { sessionStateLabel } from "./format.js";
import {
  buildOverviewConformancePresentation,
  buildOverviewHero,
  buildOverviewHeroSignalGroups,
  buildOverviewMDSObservations,
  buildOverviewRows,
  groupOverviewRows,
} from "./overview-rules.js";
import { sanitizedJson } from "./redaction.js";
import type { SessionStatus } from "./session-model.js";

export type OverviewPresentationInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  sessionStatus: SessionStatus;
  sessionBusy: boolean;
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
  const failureMessage = operationError(envelope);
  const mdsFailureMessage = input.overviewMDSState.error?.message || null;
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
    failureMessage,
    degradedMessages: [
      input.overviewBioSensorState.error?.message,
      input.overviewMDSState.error?.message,
    ].filter((message): message is string => Boolean(message)),
    reloadDisabled: loading || input.sessionBusy,
    hasReport: Boolean(report),
    info,
    rawInspectionJson: sanitizedJson(info ?? null),
    hero: buildOverviewHero({ info, device, mds: mdsResult, mdsLoading, mdsError: mdsFailureMessage }),
    signalGroups: buildOverviewHeroSignalGroups({ info }),
    overviewGroups: groupOverviewRows(overviewRows),
    conformance: buildOverviewConformancePresentation({ info }),
    mdsObservations: buildOverviewMDSObservations({ info, mds: mdsResult }),
    warningCount: overviewRows.filter((row) => row.status === "warning").length,
    sessionState: input.sessionStatus.state,
    sessionLabel: sessionStateLabel(input.sessionStatus.state),
  };
}
