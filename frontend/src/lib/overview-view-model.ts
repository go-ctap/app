import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { OperationEnvelope, SessionStatus } from "./api.js";
import type { MDSLookupViewState } from "./app-state.js";
import { bioSensorReport, inspectResult, operationError } from "./ctapkit-results.js";
import { sessionStateLabel } from "./format.js";
import {
  buildOverviewConformanceWarnings,
  buildOverviewHero,
  buildOverviewHeroSignalGroups,
  buildOverviewMDSObservations,
  buildOverviewRows,
  groupOverviewRows,
} from "./overview-rules.js";
import { sanitizedJson } from "./redaction.js";
import { m } from "../paraglide/messages.js";

export type OverviewViewModelInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  sessionStatus: SessionStatus;
  sessionBusy: boolean;
  overviewEnvelope: OperationEnvelope | null;
  overviewBioSensorEnvelope: OperationEnvelope | null;
  overviewMDSLookup: MDSLookupViewState | null;
  overviewLoading: boolean;
  overviewMDSLoading: boolean;
};

export function buildOverviewViewModel(input: OverviewViewModelInput) {
  const selector = input.selectedSelector;
  const envelope = input.overviewEnvelope;
  const mdsLookup = input.overviewMDSLookup;
  const loading = input.overviewLoading;
  const mdsLoading = input.overviewMDSLoading;
  const failureMessage = operationError(envelope);
  const mdsFailureMessage = mdsLookup?.error?.message || null;
  const report = inspectResult(envelope);
  const info = report?.info;
  const device = report?.device || input.selectedDevice;
  const mdsResult = mdsLookup?.result ?? null;
  const bioSensor = bioSensorReport(input.overviewBioSensorEnvelope);
  const overviewRows = buildOverviewRows({ info, device, bioSensor });

  return {
    selector,
    loading,
    mdsLoading,
    failureMessage,
    reloadDisabled: loading || input.sessionBusy,
    hasReport: Boolean(report),
    info,
    rawInspectionJson: sanitizedJson(info ?? null),
    hero: buildOverviewHero({ info, device, mds: mdsResult, mdsLoading, mdsError: mdsFailureMessage }),
    signalGroups: buildOverviewHeroSignalGroups({ info }),
    overviewGroups: groupOverviewRows(overviewRows),
    conformanceWarnings: buildOverviewConformanceWarnings({ info }),
    mdsObservations: buildOverviewMDSObservations({ info, mds: mdsResult }),
    warningCount: overviewRows.filter((row) => row.status === "warning").length,
    loadingRows: [m.transport(), m.session(), "AAGUID", m.versions()],
    sessionState: input.sessionStatus.state,
    sessionLabel: sessionStateLabel(input.sessionStatus.state),
  };
}
