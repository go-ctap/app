import { get } from "svelte/store";
import type { OperationEvent } from "../../bindings/github.com/go-ctap/kit/model";
import type { AuthenticatorGetInfoResponse } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  OperationEnvelope,
  RuntimeErrorEnvelope,
  type InteractionPrompt,
  type OperationEventEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import { api, type Envelope } from "./api";
import { operationFailed, operationStageLabel } from "./format";
import { m } from "../paraglide/messages.js";
import {
  activeScreen,
  appendLogEntry,
  appError,
  applyDiscovery,
  applyEnvelope,
  beginOperation,
  clearWorkbenchScreenCaches,
  finishOperation,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSEnvelope,
  overviewMDSLoading,
  pendingInteraction,
  selectedSelector,
  sessions,
  sessionStatus,
  statusBar,
  setStatusOperation,
  setStatusOutcome,
  summarizeEnvelope,
  type MDSLookupState,
} from "./stores";

let lifecycleEpoch = 0;
let overviewEpoch = 0;
let mdsEpoch = 0;

type InspectOutput = {
  result: {
    device: unknown;
    info: AuthenticatorGetInfoResponse;
  };
};

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || m.unexpected_error());
}

function failureMDSEnvelope(error: unknown): MDSLookupState {
  return { error: { message: messageFromError(error) } };
}

function failureEnvelope(error: unknown): Envelope {
  return new OperationEnvelope({ error: new RuntimeErrorEnvelope({ message: messageFromError(error) }) });
}

function inspectResultFromEnvelope(envelope: Envelope) {
  return (envelope.result as InspectOutput).result;
}

function shouldLoadBioSensor(envelope: Envelope) {
  const options = inspectResultFromEnvelope(envelope).info.options ?? {};
  return options.bioEnroll === true || options.uvBioEnroll === true;
}

function aaguidFromEnvelope(envelope: Envelope) {
  return String(inspectResultFromEnvelope(envelope).info.aaguid).trim();
}

function shouldAutoLoadOverview() {
  return get(activeScreen) === "overview" && Boolean(get(selectedSelector));
}

function selectedSessionId() {
  const sessionId = get(sessionStatus).sessionId;
  if (!sessionId) throw new Error("authenticator session is required");
  return sessionId;
}

function progressLabel(value: OperationEvent) {
  if (value.completed !== undefined && value.total !== undefined) {
    return `${value.completed} / ${value.total}`;
  }
  return operationStageLabel(value.stage);
}

function operationEventData(data: OperationEventEnvelope) {
  const event = data.event;
  return {
    operationId: data.operationId,
    stage: event.stage,
    message: event.message,
    progress: event.completed !== undefined || event.total !== undefined ? { completed: event.completed, total: event.total } : undefined,
  };
}

function statusMessage(status: { error?: RuntimeErrorEnvelope | null }) {
  return status.error ? status.error.message : m.open_session_or_refresh_devices();
}

function selectionMessage(discovery: Awaited<ReturnType<typeof api.select>>, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : fallback || m.selection_updated();
}

function selectedDeviceSummary(discovery: Awaited<ReturnType<typeof api.select>>) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : undefined;
}

export async function bootstrap() {
  const epoch = ++lifecycleEpoch;
  try {
    const status = await api.sessionStatus();
    if (epoch !== lifecycleEpoch) return;
    sessionStatus.set(status);
    if (status.state === "error" || status.state === "stale") {
      const logEntryId = appendLogEntry({
        tone: "error",
        source: "session",
        title: m.session_needs_attention(),
        message: statusMessage(status),
        selector: status.selectedSelector || get(selectedSelector),
        data: {
          session: { state: status.state, error: status.error },
        },
      });
      setStatusOutcome({
        tone: "error",
        title: m.session_needs_attention(),
        message: statusMessage(status),
        logEntryId,
      });
    }

    const discovery = await api.discover();
    if (epoch !== lifecycleEpoch) return;
    const changed = applyDiscovery(discovery);
    if ((changed || get(selectedSelector)) && get(activeScreen) === "overview") {
      await loadOverview(get(selectedSelector));
    }
  } catch (error) {
    if (epoch === lifecycleEpoch) {
      appError.set(messageFromError(error));
    }
  }
}

export async function refreshDiscovery() {
  const epoch = ++lifecycleEpoch;
  try {
    const previous = get(selectedSelector);
    const discovery = await api.discover();
    if (epoch !== lifecycleEpoch) return;
    const changed = applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "discovery",
      title: discovery.error ? m.discovery_issue() : m.discovery_refreshed(),
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices.length }),
      selector: discovery.selectedSelector || previous,
      data: {
        deviceCount: discovery.devices.length,
        selectedSelector: discovery.selectedSelector || "",
        session: { state: discovery.session.state },
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.discovery_issue() : m.discovery_refreshed(),
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices.length }),
      logEntryId,
    });
    if ((changed || get(selectedSelector) !== previous) && shouldAutoLoadOverview()) {
      await loadOverview(get(selectedSelector));
    }
  } catch (error) {
    if (epoch === lifecycleEpoch) {
      appError.set(messageFromError(error));
    }
  }
}

export async function selectToken(selector: string) {
  const epoch = ++lifecycleEpoch;
  overviewEpoch++;
  mdsEpoch++;
  overviewEnvelope.set(null);
  overviewBioSensorEnvelope.set(null);
  overviewMDSEnvelope.set(null);
  overviewMDSLoading.set(false);
  try {
    if (selector.trim()) {
      sessionStatus.set({ state: "opening", selectedSelector: selector.trim(), selectedDevice: null });
    }
    const discovery = await api.select(selector);
    if (epoch !== lifecycleEpoch) return;
    applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "selection",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: selectionMessage(discovery, selector),
      selector: discovery.selectedSelector || selector,
      data: {
        selectedSelector: discovery.selectedSelector || selector,
        selectedDevice: selectedDeviceSummary(discovery),
        session: { state: discovery.session.state },
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: selectionMessage(discovery, selector),
      logEntryId,
    });
    if (get(activeScreen) === "overview" && get(selectedSelector)) {
      await loadOverview(get(selectedSelector));
    }
  } catch (error) {
    if (epoch === lifecycleEpoch) {
      appError.set(messageFromError(error));
    }
  }
}

export async function closeSelectedSession() {
  try {
    const status = await api.closeSession(selectedSessionId());
    sessionStatus.set(status);
    await refreshSessionList();
    clearWorkbenchScreenCaches();
    const logEntryId = appendLogEntry({
      tone: "info",
      source: "session",
      title: m.session_closed_title(),
      message: m.cached_authorization_released(),
      selector: status.selectedSelector || get(selectedSelector),
      data: {
        session: { state: status.state },
      },
    });
    setStatusOutcome({ tone: "info", title: m.session_closed_title(), message: m.cached_authorization_released(), logEntryId });
  } catch (error) {
    const message = messageFromError(error);
    appError.set(message);
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: m.could_not_close_session(),
      message,
      selector: get(selectedSelector),
      data: { error: { message } },
    });
    setStatusOutcome({ tone: "error", title: m.could_not_close_session(), message, logEntryId });
  }
}

export async function closeAllSessions() {
  try {
    const closed = await api.closeAllSessions();
    const selector = get(selectedSelector);
    sessions.set([]);
    sessionStatus.set({ state: selector ? "closed" : "idle", selectedSelector: selector, selectedDevice: null });
    clearWorkbenchScreenCaches();
    const logEntryId = appendLogEntry({
      tone: "info",
      source: "session",
      title: m.all_sessions_closed(),
      message: m.cached_authorization_released(),
      selector,
      data: {
        closedSessions: closed.length,
      },
    });
    setStatusOutcome({ tone: "info", title: m.all_sessions_closed(), message: m.cached_authorization_released(), logEntryId });
  } catch (error) {
    const message = messageFromError(error);
    appError.set(message);
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: m.could_not_close_session(),
      message,
      selector: get(selectedSelector),
      data: { error: { message } },
    });
    setStatusOutcome({ tone: "error", title: m.could_not_close_session(), message, logEntryId });
  }
}

export async function openSelectedSession(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) return;
  try {
    beginOperation(m.open_session(), "session-recovery");
    const status = await api.openSession({ selector });
    sessionStatus.set(status);
    await refreshSessionList();
    finishOperation();
    if (status.error) {
      const logEntryId = appendLogEntry({
        tone: "error",
        source: "session",
        title: m.open_session_failed(),
        message: status.error.message,
        selector,
        detailId: "session-recovery",
        data: { session: status },
      });
      setStatusOutcome({ tone: "error", title: m.open_session_failed(), message: status.error.message, detailId: "session-recovery", logEntryId, retry: () => openSelectedSession(selector) });
      return;
    }
    const logEntryId = appendLogEntry({
      tone: "success",
      source: "session",
      title: m.session_open_title(),
      message: m.selected_session_ready(),
      selector,
      detailId: "session-recovery",
      data: { session: status },
    });
    setStatusOutcome({ tone: "success", title: m.session_open_title(), message: m.selected_session_ready(), detailId: "session-recovery", logEntryId });
  } catch (error) {
    finishOperation();
    const message = messageFromError(error);
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: m.open_session_failed(),
      message,
      selector,
      detailId: "session-recovery",
      data: { error: { message } },
    });
    setStatusOutcome({ tone: "error", title: m.open_session_failed(), message, detailId: "session-recovery", logEntryId, retry: () => openSelectedSession(selector) });
  }
}

export async function refreshSessionList() {
  try {
    sessions.set(await api.sessions());
  } catch {
    sessions.set([]);
  }
}

export async function loadOverview(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) {
    overviewEnvelope.set(null);
    overviewBioSensorEnvelope.set(null);
    overviewMDSEnvelope.set(null);
    overviewLoading.set(false);
    overviewMDSLoading.set(false);
    return;
  }

  const epoch = ++overviewEpoch;
  mdsEpoch++;
  overviewLoading.set(true);
  overviewBioSensorEnvelope.set(null);
  overviewMDSEnvelope.set(null);
  overviewMDSLoading.set(false);
  try {
    beginOperation(m.overview_inspection(), "overview-dashboard");
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    if (epoch !== overviewEpoch || selector !== get(selectedSelector)) return;
    overviewEnvelope.set(envelope);
    applyEnvelope(envelope);
    const aaguid = !operationFailed(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid, false, selector);
    }
    if (!operationFailed(envelope) && shouldLoadBioSensor(envelope)) {
      try {
        const bioEnvelope = await api.bioSensorInfo({ sessionId });
        if (epoch !== overviewEpoch || selector !== get(selectedSelector)) return;
        overviewBioSensorEnvelope.set(bioEnvelope);
        applyEnvelope(bioEnvelope);
      } catch {
        if (epoch === overviewEpoch && selector === get(selectedSelector)) {
          overviewBioSensorEnvelope.set(null);
        }
      }
    }
    summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
    if (operationFailed(envelope)) {
      appError.set(null);
    }
  } catch (error) {
    if (epoch === overviewEpoch && selector === get(selectedSelector)) {
      const envelope = failureEnvelope(error);
      overviewEnvelope.set(envelope);
      overviewBioSensorEnvelope.set(null);
      summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
    }
  } finally {
    if (epoch === overviewEpoch) {
      overviewLoading.set(false);
    }
  }
}

export async function loadOverviewMDS(aaguid: string, refresh = false, selector = get(selectedSelector)) {
  aaguid = aaguid.trim();
  selector = selector.trim();
  const epoch = ++mdsEpoch;
  if (!aaguid || !selector) {
    overviewMDSEnvelope.set(null);
    overviewMDSLoading.set(false);
    return;
  }

  overviewMDSLoading.set(true);
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    if (epoch !== mdsEpoch || selector !== get(selectedSelector)) return;
    overviewMDSEnvelope.set(envelope);
  } catch (error) {
    if (epoch === mdsEpoch && selector === get(selectedSelector)) {
      overviewMDSEnvelope.set(failureMDSEnvelope(error));
    }
  } finally {
    if (epoch === mdsEpoch) {
      overviewMDSLoading.set(false);
    }
  }
}

export function handleOperationProgress(data: OperationEventEnvelope) {
  if (!data.operationId) {
    setStatusOperation(null);
    return;
  }

  const logEntryId = appendLogEntry({
    tone: "info",
    source: "operation-progress",
    title: data.event.message || operationStageLabel(data.event.stage),
    message: progressLabel(data.event),
    operationId: data.operationId,
    stage: data.event.stage,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: operationEventData(data),
  });

  const currentOperation = get(statusBar).activeOperation;
  setStatusOperation(currentOperation ? { ...currentOperation, ...data, logEntryId } : { ...data, logEntryId });
}

export function handleInteractionRequested(data: InteractionPrompt) {
  pendingInteraction.set(data);
  appendLogEntry({
    tone: "warning",
    source: "operation-interaction",
    title: m.stage_interaction_required(),
    message: operationStageLabel("interaction-required"),
    operationId: data.operationId,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      operationId: data.operationId,
      interactionId: data.interactionId,
      request: {
        kind: data.request.kind || m.interaction(),
        permission: data.request.permission,
        destructive: data.request.destructive,
        hasPreview: Boolean(data.request.preview),
      },
    },
  });
}
