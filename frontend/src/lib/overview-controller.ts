import { get } from "svelte/store";

import type { InspectEnvelope, RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  errorLoadState,
  idleLoadState,
  loadingLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
  readyLoadState,
} from "./features/overview/state.js";
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { beginOperation, setStatusOutcome, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

function reportDegradedOverviewLoad(label: string, error: RuntimeErrorEnvelope) {
  setStatusOutcome({
    tone: "warning",
    title: m.operation_failed_with_label({ label }),
    message: error.message,
  });
}

function inspectResultFromEnvelope(envelope: InspectEnvelope) {
  if (envelope.error || !envelope.result) throw new Error("inspect result is required");
  return envelope.result.result;
}

function shouldLoadBioSensor(envelope: InspectEnvelope) {
  const options = inspectResultFromEnvelope(envelope).info.options ?? {};
  return options.bioEnroll === true || options.uvBioEnroll === true;
}

function canAutoLoadOverview() {
  const selector = get(selectedSelector).trim();
  return get(activeScreen) === "overview"
    && Boolean(selector && get(sessionStatus).sessionId)
    && get(overviewInspection).state === "idle";
}

export async function maybeLoadOverview() {
  if (!canAutoLoadOverview()) return;
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
    beginOperation(m.overview_inspection());
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    overviewInspection.set(readyLoadState(envelope));
    const aaguid = envelope.error ? "" : inspectResultFromEnvelope(envelope).info.aaguid.trim();
    if (aaguid) {
      void loadOverviewMDS(aaguid);
    }
    if (!envelope.error && shouldLoadBioSensor(envelope)) {
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
    summarizeEnvelope(m.overview_inspection(), envelope, () => loadOverview());
    applyInvalidSessionError(envelope.error);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    overviewInspection.set(errorLoadState(runtimeError));
    overviewBioSensor.set(idleLoadState());
    summarizeOperationFailure(m.overview_inspection(), runtimeError, () => loadOverview());
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
