import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { InspectEnvelope } from "../../bindings/fidobench/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  errorLoadState,
  idleLoadState,
  loadingLoadState,
  overviewBioSensor,
  overviewMDS,
  readyLoadState,
} from "./features/overview/state.js";
import { authenticatorInspection, selectedSelector, authenticatorStatus } from "./features/authenticator/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { failureMessage, runtimeFailureFrom } from "./failure.js";
import { inspectResult } from "./ctapkit-results.js";
import { applyInvalidSelectionError, applyOperationAuthenticatorBoundary, currentSelectionID } from "./authenticator-boundary.js";
import { beginOperation, setStatusOutcome, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

function reportDegradedOverviewLoad(label: string, error: Failure) {
  setStatusOutcome({
    tone: "warning",
    title: m.operation_failed_with_label({ label }),
    message: failureMessage(error),
  });
}

function shouldLoadBioSensor(envelope: InspectEnvelope) {
  const options = inspectResult(envelope)?.info.options ?? {};
  return options.bioEnroll === true || options.uvBioEnroll === true;
}

export function invalidateOverviewCache() {
  authenticatorInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
}

function canAutoLoadOverview() {
  const selector = get(selectedSelector).trim();
  const screen = get(activeScreen);
  const inspectionState = get(authenticatorInspection).state;
  const overviewDetailsIdle = get(overviewBioSensor).state === "idle" && get(overviewMDS).state === "idle";
  return Boolean(selector && get(authenticatorStatus).selectionId) && (
    screen === "lab" && inspectionState === "idle"
    || screen === "overview" && (
      inspectionState === "idle"
      || inspectionState === "ready" && overviewDetailsIdle
    )
  );
}

export async function maybeLoadOverview() {
  if (!canAutoLoadOverview()) return;
  const inspection = get(authenticatorInspection);
  if (get(activeScreen) === "overview" && inspection.state === "ready" && inspection.data) {
    const biometricFailure = await loadOverviewDetails(inspection.data, currentSelectionID());
    if (biometricFailure) {
      reportDegradedOverviewLoad(m.biometrics(), biometricFailure);
      applyInvalidSelectionError(biometricFailure);
    }
    return;
  }
  await loadOverview();
}

async function loadOverviewDetails(envelope: InspectEnvelope, selectionId: string) {
  const aaguid = inspectResult(envelope)?.info.aaguid.trim() ?? "";
  if (aaguid) {
    void loadOverviewMDS(aaguid);
  }
  if (!shouldLoadBioSensor(envelope)) return null;

  overviewBioSensor.set(loadingLoadState());
  try {
    const bioEnvelope = await api.bioSensorInfo({ selectionId });
    if (bioEnvelope.error) {
      overviewBioSensor.set(errorLoadState(bioEnvelope.error, bioEnvelope));
      return bioEnvelope.error;
    }
    overviewBioSensor.set(readyLoadState(bioEnvelope));
    return null;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    overviewBioSensor.set(errorLoadState(runtimeError));
    return runtimeError;
  }
}

export async function loadOverview() {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    authenticatorInspection.set(idleLoadState());
    overviewBioSensor.set(idleLoadState());
    overviewMDS.set(idleLoadState());
    return;
  }

  authenticatorInspection.set(loadingLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
  try {
    beginOperation(m.overview_inspection());
    const selectionId = currentSelectionID();
    const envelope = await api.inspect({ selectionId });
    authenticatorInspection.set(
      envelope.error
        ? errorLoadState(envelope.error, envelope)
        : readyLoadState(envelope),
    );
    let biometricFailure: Failure | null = null;
    if (!envelope.error && get(activeScreen) === "overview") {
      biometricFailure = await loadOverviewDetails(envelope, selectionId);
    }
    summarizeEnvelope(m.overview_inspection(), envelope);
    applyOperationAuthenticatorBoundary(envelope);
    if (biometricFailure) {
      reportDegradedOverviewLoad(m.biometrics(), biometricFailure);
      applyInvalidSelectionError(biometricFailure);
    }
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    authenticatorInspection.set(errorLoadState(runtimeError));
    overviewBioSensor.set(idleLoadState());
    summarizeOperationFailure(m.overview_inspection(), runtimeError);
    applyInvalidSelectionError(runtimeError);
  }
}

export async function loadOverviewMDS(aaguid: string, refresh = false) {
  aaguid = aaguid.trim();
  const selector = get(selectedSelector).trim();
  if (!aaguid || !selector) {
    overviewMDS.set(idleLoadState());
    return false;
  }

  overviewMDS.set(loadingLoadState());
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    overviewMDS.set(readyLoadState(envelope.result));
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    overviewMDS.set(errorLoadState(runtimeError));
    reportDegradedOverviewLoad(m.metadata_service(), runtimeError);
    return false;
  }
}
