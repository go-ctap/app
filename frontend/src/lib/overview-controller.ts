import { get } from "svelte/store";

import type { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api, type OperationEnvelope } from "./api.js";
import { inspectResult, operationError } from "./ctapkit-results.js";
import {
  errorLoadState,
  idleLoadState,
  loadingLoadState,
  overviewBioSensor,
  overviewInspectionEnvelope,
  overviewInspection,
  overviewLoading,
  overviewMDS,
  readyLoadState,
} from "./features/overview/state.js";
import {
  selectedSelector,
  sessionStatus,
} from "./features/session/state.js";
import {
  activeScreen,
  appError,
} from "./features/workbench/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { appendLogEntry, beginOperation, setStatusOutcome, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

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
  return get(activeScreen) === "overview" && Boolean(overviewAutoLoadKey()) && !get(overviewInspectionEnvelope) && !get(overviewLoading);
}

export async function maybeLoadOverview() {
  if (!shouldAutoLoadOverview()) return;
  await loadOverview();
}

export async function loadOverview() {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    overviewInspection.set(idleLoadState());
    overviewBioSensor.set(idleLoadState());
    overviewMDS.set(idleLoadState());
    return;
  }

  overviewInspection.set(loadingLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  try {
    beginOperation(m.overview_inspection(), "overview-dashboard");
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    overviewInspection.set(readyLoadState(envelope));
    const aaguid = !operationError(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid);
    }
    if (!operationError(envelope) && shouldLoadBioSensor(envelope)) {
      overviewBioSensor.set(loadingLoadState());
      try {
        const bioEnvelope = await api.bioSensorInfo({ sessionId });
        if (bioEnvelope.error) {
          overviewBioSensor.set(errorLoadState(bioEnvelope.error, bioEnvelope));
          reportDegradedOverviewLoad(m.biometrics(), bioEnvelope.error);
        } else {
          overviewBioSensor.set(readyLoadState(bioEnvelope));
        }
      } catch (error) {
        const runtimeError = runtimeErrorFrom(error);
        overviewBioSensor.set(errorLoadState(runtimeError));
        reportDegradedOverviewLoad(m.biometrics(), runtimeError);
      }
    }
    summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview());
    applyInvalidSessionError(envelope.error);
    if (operationError(envelope)) {
      appError.set(null);
    }
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    overviewInspection.set(errorLoadState(runtimeError));
    overviewBioSensor.set(idleLoadState());
    summarizeOperationFailure(m.overview_inspection(), runtimeError, "overview-dashboard", () => loadOverview());
    applyInvalidSessionError(runtimeError);
  } finally {
    const current = get(overviewInspection);
    if (current.state === "loading") overviewInspection.set(idleLoadState());
  }
}

export async function loadOverviewMDS(aaguid: string, refresh = false) {
  aaguid = aaguid.trim();
  const selector = get(selectedSelector).trim();
  if (!aaguid || !selector) {
    overviewMDS.set(idleLoadState());
    return;
  }

  overviewMDS.set(loadingLoadState());
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    overviewMDS.set(readyLoadState(envelope.result));
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    overviewMDS.set(errorLoadState(runtimeError));
    reportDegradedOverviewLoad(m.metadata_service(), runtimeError);
  } finally {
    const current = get(overviewMDS);
    if (current.state === "loading") overviewMDS.set(idleLoadState());
  }
}
