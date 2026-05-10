import { get } from "svelte/store";
import { api, operationFailed, type Envelope } from "./api";
import { operationStageLabel } from "./format";
import { m } from "../paraglide/messages.js";
import {
  activeScreen,
  appendLogEntry,
  appError,
  applyDiscovery,
  applyEnvelope,
  beginOperation,
  clearSharedCredentialInventory,
  clearWorkbenchScreenCaches,
  finishOperation,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSEnvelope,
  overviewMDSLoading,
  pendingInteraction,
  selectedSelector,
  sessionStatus,
  statusBar,
  setStatusOperation,
  setStatusOutcome,
  summarizeEnvelope,
} from "./stores";

let lifecycleEpoch = 0;
let overviewEpoch = 0;
let mdsEpoch = 0;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || m.unexpected_error());
}

function failureEnvelope(error: unknown): Envelope {
  return { error: { message: messageFromError(error) } };
}

function resultFromEnvelope(envelope: Envelope | null | undefined) {
  return envelope?.result?.result ?? envelope?.result?.report ?? envelope?.result ?? null;
}

function shouldLoadBioSensor(envelope: Envelope | null | undefined) {
  const report = resultFromEnvelope(envelope);
  const options = report?.info?.options || {};
  return options.bioEnroll === true || options.uvBioEnroll === true;
}

function aaguidFromEnvelope(envelope: Envelope | null | undefined) {
  const report = resultFromEnvelope(envelope);
  return typeof report?.info?.aaguid === "string" ? report.info.aaguid.trim() : "";
}

function shouldAutoLoadOverview() {
  return get(activeScreen) === "overview" && Boolean(get(selectedSelector));
}

function progressLabel(value: any) {
  if (!value) return "";
  if (value.completed !== undefined && value.total !== undefined) {
    return `${value.completed} / ${value.total}`;
  }
  return operationStageLabel(value.stage);
}

function operationEventData(data: any) {
  const event = data?.event || {};
  return {
    operationId: data?.operationId,
    stage: event.stage,
    message: event.message,
    progress: event.completed !== undefined || event.total !== undefined ? { completed: event.completed, total: event.total } : undefined,
  };
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
        message: status.error?.hint || status.error?.message || m.open_session_or_refresh_devices(),
        selector: status.selectedSelector || get(selectedSelector),
        data: {
          session: { state: status.state, error: status.error },
        },
      });
      setStatusOutcome({
        tone: "error",
        title: m.session_needs_attention(),
        message: status.error?.hint || status.error?.message || m.open_session_or_refresh_devices(),
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
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices?.length || 0 }),
      selector: discovery.selectedSelector || previous,
      data: {
        deviceCount: discovery.devices?.length || 0,
        selectedSelector: discovery.selectedSelector || "",
        session: discovery.session ? { state: discovery.session.state } : undefined,
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.discovery_issue() : m.discovery_refreshed(),
      message: discovery.error ? discovery.error.message : m.authenticators_found({ count: discovery.devices?.length || 0 }),
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
    const discovery = await api.select(selector);
    if (epoch !== lifecycleEpoch) return;
    applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "selection",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId || selector || m.selection_updated(),
      selector: discovery.selectedSelector || selector,
      data: {
        selectedSelector: discovery.selectedSelector || selector,
        selectedDevice: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId,
        session: discovery.session ? { state: discovery.session.state } : undefined,
        error: discovery.error,
      },
    });
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? m.token_selection_issue() : m.token_selected(),
      message: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId || selector || m.selection_updated(),
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
    const status = await api.closeSession();
    sessionStatus.set(status);
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
    appError.set(messageFromError(error));
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: m.could_not_close_session(),
      message: messageFromError(error),
      selector: get(selectedSelector),
      data: { error: { message: messageFromError(error) } },
    });
    setStatusOutcome({ tone: "error", title: m.could_not_close_session(), message: messageFromError(error), logEntryId });
  }
}

export async function openSelectedSession(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) return;
  try {
    beginOperation(m.open_session(), "session-recovery");
    const status = await api.openSession(selector);
    sessionStatus.set(status);
    finishOperation();
    if (status.error) {
      const logEntryId = appendLogEntry({
        tone: "error",
        source: "session",
        title: m.open_session_failed(),
        message: status.error.hint ? `${status.error.message} ${status.error.hint}` : status.error.message,
        selector,
        detailId: "session-recovery",
        data: { session: status },
      });
      setStatusOutcome({ tone: "error", title: m.open_session_failed(), message: status.error.hint ? `${status.error.message} ${status.error.hint}` : status.error.message, detailId: "session-recovery", logEntryId, retry: () => openSelectedSession(selector) });
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
    const envelope = await api.inspect(selector);
    if (epoch !== overviewEpoch || selector !== get(selectedSelector)) return;
    overviewEnvelope.set(envelope);
    applyEnvelope(envelope);
    const aaguid = !operationFailed(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid, false, selector);
    }
    if (!operationFailed(envelope) && shouldLoadBioSensor(envelope)) {
      try {
        const bioEnvelope = await api.bioSensorInfo(selector);
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
    const envelope = await api.lookupMDS(aaguid, refresh);
    if (epoch !== mdsEpoch || selector !== get(selectedSelector)) return;
    overviewMDSEnvelope.set(envelope);
  } catch (error) {
    if (epoch === mdsEpoch && selector === get(selectedSelector)) {
      overviewMDSEnvelope.set(failureEnvelope(error));
    }
  } finally {
    if (epoch === mdsEpoch) {
      overviewMDSLoading.set(false);
    }
  }
}

export function handleOperationProgress(data: any) {
  if (!data?.operationId) {
    setStatusOperation(null);
    return;
  }

  const logEntryId = appendLogEntry({
    tone: "info",
    source: "operation-progress",
    title: data.event?.message || operationStageLabel(data.event?.stage),
    message: progressLabel(data.event),
    operationId: data.operationId,
    stage: data.event?.stage,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: operationEventData(data),
  });

  const currentOperation = get(statusBar).activeOperation || {};
  setStatusOperation({ ...currentOperation, ...data, logEntryId });
}

export function handleSessionChanged(data: any) {
  sessionStatus.set(data);
  const isActiveSession = ["opening", "running"].includes(data?.state || "");
  if (data?.activeOperation && isActiveSession) {
    const currentOperation = get(statusBar).activeOperation || {};
    setStatusOperation({
      ...currentOperation,
      operationId: data.activeOperation,
      event: currentOperation.event || { message: m.operation_running() },
    });
  } else if (!data?.activeOperation && !isActiveSession) {
    setStatusOperation(null);
  }
  if (data?.state === "stale" || data?.state === "error") {
    clearSharedCredentialInventory(data?.selectedSelector || get(selectedSelector));
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: m.session_needs_attention(),
      message: data.error?.hint || data.error?.message || m.open_session_or_refresh_devices(),
      selector: data.selectedSelector || get(selectedSelector),
      data: {
        session: { state: data.state, activeOperation: data.activeOperation, error: data.error },
      },
    });
    setStatusOutcome({
      tone: "error",
      title: m.session_needs_attention(),
      message: data.error?.hint || data.error?.message || m.open_session_or_refresh_devices(),
      logEntryId,
    });
  }
}

export function handleInteractionRequested(data: any) {
  pendingInteraction.set(data);
  appendLogEntry({
    tone: "warning",
    source: "operation-interaction",
    title: m.stage_interaction_required(),
    message: operationStageLabel("interaction-required"),
    operationId: data?.operationId,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      operationId: data?.operationId,
      interactionId: data?.interactionId,
      request: {
        type: data?.request?.type || data?.request?.kind || data?.request?.prompt || m.interaction(),
      },
    },
  });
}
