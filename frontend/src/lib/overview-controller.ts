import { get } from "svelte/store";
import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { InspectEnvelope, RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import {
  api,
  runtimeErrorFrom,
  type OperationEnvelope,
} from "./api.js";
import {
  activeScreen,
  appError,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSLoading,
  overviewMDSLookup,
  pendingInteraction,
  selectedSelector,
  sessionStatus,
  type MDSLookupViewState,
} from "./app-state.js";
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
import { beginOperation, summarizeEnvelope } from "./workbench-state.js";
import { m } from "../paraglide/messages.js";

function failureMDSLookup(error: unknown): MDSLookupViewState {
  return { error: runtimeErrorFrom(error) };
}

function failureEnvelope(error: unknown): OperationEnvelope {
  return new InspectEnvelope({ kind: OperationKind.OperationInspect, error: runtimeErrorFrom(error) });
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
    overviewEnvelope.set(null);
    overviewBioSensorEnvelope.set(null);
    overviewMDSLookup.set(null);
    overviewLoading.set(false);
    overviewMDSLoading.set(false);
    return;
  }

  const epoch = beginOverviewEpoch();
  bumpMDSEpoch();
  overviewLoading.set(true);
  overviewBioSensorEnvelope.set(null);
  overviewMDSLookup.set(null);
  overviewMDSLoading.set(false);
  try {
    beginOperation(m.overview_inspection(), "overview-dashboard");
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    if (!isCurrentOverviewEpoch(epoch) || selector !== get(selectedSelector)) return;
    overviewEnvelope.set(envelope);
    const aaguid = !operationError(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid, false, selector);
    }
    if (!operationError(envelope) && shouldLoadBioSensor(envelope)) {
      try {
        const bioEnvelope = await api.bioSensorInfo({ sessionId });
        if (!isCurrentOverviewEpoch(epoch) || selector !== get(selectedSelector)) return;
        overviewBioSensorEnvelope.set(bioEnvelope);
      } catch {
        if (isCurrentOverviewEpoch(epoch) && selector === get(selectedSelector)) {
          overviewBioSensorEnvelope.set(null);
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
      const envelope = failureEnvelope(error);
      overviewEnvelope.set(envelope);
      overviewBioSensorEnvelope.set(null);
      summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
      applySessionError(envelope.error);
    }
  } finally {
    if (isCurrentOverviewEpoch(epoch)) {
      overviewLoading.set(false);
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
    overviewMDSLookup.set(null);
    overviewMDSLoading.set(false);
    return;
  }

  overviewMDSLoading.set(true);
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    if (!isCurrentMDSEpoch(epoch) || selector !== get(selectedSelector)) return;
    overviewMDSLookup.set({ result: envelope.result });
  } catch (error) {
    if (isCurrentMDSEpoch(epoch) && selector === get(selectedSelector)) {
      overviewMDSLookup.set(failureMDSLookup(error));
    }
  } finally {
    if (isCurrentMDSEpoch(epoch)) {
      overviewMDSLoading.set(false);
    }
  }
}
