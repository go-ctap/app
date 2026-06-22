import { get } from "svelte/store";
import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { InspectEnvelope, RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import {
  api,
  runtimeErrorFrom,
  type OperationEnvelope,
} from "./api.js";
import {
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import {
  activeScreen,
  appError,
} from "./features/workbench/state.js";
import { pendingInteraction } from "./features/interaction/state.js";
import {
  errorLoadState,
  idleLoadState,
  loadingLoadState,
  overviewBioSensor,
  overviewEnvelope,
  overviewInspection,
  overviewLoading,
  overviewMDS,
  readyLoadState,
} from "./features/overview/state.js";
import { inspectResult, operationError } from "./ctapkit-results.js";
import {
  beginMDSEpoch,
  beginOverviewEpoch,
  bumpOverviewEpoch,
  bumpMDSEpoch,
  isCurrentMDSEpoch,
  isCurrentOverviewEpoch,
} from "./controller-epochs.js";
import { selectedSessionId } from "./session-boundary.js";
import { appendLogEntry, beginOperation, setStatusOutcome, summarizeEnvelope } from "./workbench-state.js";
import { m } from "../paraglide/messages.js";

function failureEnvelope(error: RuntimeErrorEnvelope): OperationEnvelope {
  return new InspectEnvelope({ kind: OperationKind.OperationInspect, error });
}

function reportDegradedOverviewLoad(label: string, error: RuntimeErrorEnvelope) {
  const logEntryId = appendLogEntry({
    tone: "warning",
    source: "overview",
    title: m.operation_failed_with_label({ label }),
    message: error.message,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      label,
      error,
    },
  });
  setStatusOutcome({
    tone: "warning",
    title: m.operation_failed_with_label({ label }),
    message: error.message,
    logEntryId,
  });
}

function inspectResultFromEnvelope(envelope: OperationEnvelope) {
  const result = inspectResult(envelope);
  if (!result) throw new Error("inspect result is required");
  return result;
}

function shouldLoadBioSensor(envelope: OperationEnvelope) {
  const options = inspectResultFromEnvelope(envelope).info.options ?? {};
  return options.bioEnroll === true || options.uvBioEnroll === true;
}

function aaguidFromEnvelope(envelope: OperationEnvelope) {
  return String(inspectResultFromEnvelope(envelope).info.aaguid).trim();
}

function overviewAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const sessionId = get(sessionStatus).sessionId || "";
  return selector && sessionId ? `${selector}:${sessionId}` : "";
}

function shouldAutoLoadOverview() {
  return get(activeScreen) === "overview" && Boolean(overviewAutoLoadKey()) && !get(overviewEnvelope) && !get(overviewLoading);
}

export async function maybeLoadOverview() {
  if (!shouldAutoLoadOverview()) return;
  await loadOverview(get(selectedSelector));
}

export function invalidateOverviewLoads() {
  bumpOverviewEpoch();
  bumpMDSEpoch();
}

export async function loadOverview(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) {
    overviewInspection.set(idleLoadState());
    overviewBioSensor.set(idleLoadState());
    overviewMDS.set(idleLoadState());
    return;
  }

  const epoch = beginOverviewEpoch();
  bumpMDSEpoch();
  overviewInspection.set(loadingLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  try {
    beginOperation(m.overview_inspection(), "overview-dashboard");
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    if (!isCurrentOverviewEpoch(epoch) || selector !== get(selectedSelector)) return;
    overviewInspection.set(readyLoadState(envelope));
    const aaguid = !operationError(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid, false, selector);
    }
    if (!operationError(envelope) && shouldLoadBioSensor(envelope)) {
      overviewBioSensor.set(loadingLoadState());
      try {
        const bioEnvelope = await api.bioSensorInfo({ sessionId });
        if (!isCurrentOverviewEpoch(epoch) || selector !== get(selectedSelector)) return;
        if (bioEnvelope.error) {
          overviewBioSensor.set(errorLoadState(bioEnvelope.error, bioEnvelope));
          reportDegradedOverviewLoad(m.biometrics(), bioEnvelope.error);
        } else {
          overviewBioSensor.set(readyLoadState(bioEnvelope));
        }
      } catch (error) {
        if (isCurrentOverviewEpoch(epoch) && selector === get(selectedSelector)) {
          const runtimeError = runtimeErrorFrom(error);
          overviewBioSensor.set(errorLoadState(runtimeError));
          reportDegradedOverviewLoad(m.biometrics(), runtimeError);
        }
      }
    }
    summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
    applySessionError(envelope.error);
    if (operationError(envelope)) {
      appError.set(null);
    }
  } catch (error) {
    if (isCurrentOverviewEpoch(epoch) && selector === get(selectedSelector)) {
      const runtimeError = runtimeErrorFrom(error);
      const envelope = failureEnvelope(runtimeError);
      overviewInspection.set(errorLoadState(runtimeError, envelope));
      overviewBioSensor.set(idleLoadState());
      summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
      applySessionError(envelope.error);
    }
  } finally {
    if (isCurrentOverviewEpoch(epoch)) {
      const current = get(overviewInspection);
      if (current.state === "loading") overviewInspection.set(idleLoadState());
    }
  }
}

function applySessionError(error: RuntimeErrorEnvelope | null | undefined) {
  if (error?.category !== "invalid-session") return;
  pendingInteraction.set(null);
  sessionStatus.update((state) => ({
    ...state,
    state: "stale",
    error,
  }));
}

export async function loadOverviewMDS(aaguid: string, refresh = false, selector = get(selectedSelector)) {
  aaguid = aaguid.trim();
  selector = selector.trim();
  const epoch = beginMDSEpoch();
  if (!aaguid || !selector) {
    overviewMDS.set(idleLoadState());
    return;
  }

  overviewMDS.set(loadingLoadState());
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    if (!isCurrentMDSEpoch(epoch) || selector !== get(selectedSelector)) return;
    overviewMDS.set(readyLoadState(envelope.result));
  } catch (error) {
    if (isCurrentMDSEpoch(epoch) && selector === get(selectedSelector)) {
      const runtimeError = runtimeErrorFrom(error);
      overviewMDS.set(errorLoadState(runtimeError));
      reportDegradedOverviewLoad(m.metadata_service(), runtimeError);
    }
  } finally {
    if (isCurrentMDSEpoch(epoch)) {
      const current = get(overviewMDS);
      if (current.state === "loading") overviewMDS.set(idleLoadState());
    }
  }
}
