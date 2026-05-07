import { get } from "svelte/store";
import { api, operationFailed, type Envelope } from "./api";
import { operationStageLabel } from "./format";
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
  overviewEnvelope,
  overviewLoading,
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

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unexpected error");
}

function failureEnvelope(error: unknown): Envelope {
  return { error: { message: messageFromError(error) } };
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
        title: "Session needs attention",
        message: status.error?.hint || status.error?.message || "Open the selected session again or refresh devices.",
        selector: status.selectedSelector || get(selectedSelector),
        data: {
          session: { state: status.state, error: status.error },
        },
      });
      setStatusOutcome({
        tone: "error",
        title: "Session needs attention",
        message: status.error?.hint || status.error?.message || "Open the selected session again or refresh devices.",
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
      title: discovery.error ? "Discovery issue" : "Discovery refreshed",
      message: discovery.error ? discovery.error.message : `${discovery.devices?.length || 0} authenticator(s) found.`,
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
      title: discovery.error ? "Discovery issue" : "Discovery refreshed",
      message: discovery.error ? discovery.error.message : `${discovery.devices?.length || 0} authenticator(s) found.`,
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
  overviewEnvelope.set(null);
  try {
    const discovery = await api.select(selector);
    if (epoch !== lifecycleEpoch) return;
    applyDiscovery(discovery);
    const logEntryId = appendLogEntry({
      tone: discovery.error ? "error" : "info",
      source: "selection",
      title: discovery.error ? "Token selection issue" : "Token selected",
      message: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId || selector || "Selection updated.",
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
      title: discovery.error ? "Token selection issue" : "Token selected",
      message: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId || selector || "Selection updated.",
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

export async function lockSelectedSession() {
  try {
    const status = await api.lockSession();
    sessionStatus.set(status);
    clearWorkbenchScreenCaches();
    const logEntryId = appendLogEntry({
      tone: "info",
      source: "session",
      title: "Session locked",
      message: "Cached authenticator authorization was closed.",
      selector: status.selectedSelector || get(selectedSelector),
      data: {
        session: { state: status.state },
      },
    });
    setStatusOutcome({ tone: "info", title: "Session locked", message: "Cached authenticator authorization was closed.", logEntryId });
  } catch (error) {
    appError.set(messageFromError(error));
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: "Could not lock session",
      message: messageFromError(error),
      selector: get(selectedSelector),
      data: { error: { message: messageFromError(error) } },
    });
    setStatusOutcome({ tone: "error", title: "Could not lock session", message: messageFromError(error), logEntryId });
  }
}

export async function openSelectedSession(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) return;
  try {
    beginOperation("Open session", "session-recovery");
    const status = await api.openSession(selector);
    sessionStatus.set(status);
    finishOperation();
    if (status.error) {
      const logEntryId = appendLogEntry({
        tone: "error",
        source: "session",
        title: "Open session failed",
        message: status.error.hint ? `${status.error.message} ${status.error.hint}` : status.error.message,
        selector,
        detailId: "session-recovery",
        data: { session: status },
      });
      setStatusOutcome({ tone: "error", title: "Open session failed", message: status.error.hint ? `${status.error.message} ${status.error.hint}` : status.error.message, detailId: "session-recovery", logEntryId, retry: () => openSelectedSession(selector) });
      return;
    }
    const logEntryId = appendLogEntry({
      tone: "success",
      source: "session",
      title: "Session open",
      message: "Selected authenticator session is ready.",
      selector,
      detailId: "session-recovery",
      data: { session: status },
    });
    setStatusOutcome({ tone: "success", title: "Session open", message: "Selected authenticator session is ready.", detailId: "session-recovery", logEntryId });
  } catch (error) {
    finishOperation();
    const message = messageFromError(error);
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: "Open session failed",
      message,
      selector,
      detailId: "session-recovery",
      data: { error: { message } },
    });
    setStatusOutcome({ tone: "error", title: "Open session failed", message, detailId: "session-recovery", logEntryId, retry: () => openSelectedSession(selector) });
  }
}

export async function loadOverview(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) {
    overviewEnvelope.set(null);
    overviewLoading.set(false);
    return;
  }

  const epoch = ++overviewEpoch;
  overviewLoading.set(true);
  try {
    beginOperation("Overview inspection", "overview-dashboard");
    const envelope = await api.inspect(selector);
    if (epoch !== overviewEpoch || selector !== get(selectedSelector)) return;
    overviewEnvelope.set(envelope);
    applyEnvelope(envelope);
    summarizeEnvelope("Overview inspection", envelope, "overview-dashboard", () => loadOverview(selector));
    if (operationFailed(envelope)) {
      appError.set(null);
    }
  } catch (error) {
    if (epoch === overviewEpoch && selector === get(selectedSelector)) {
      const envelope = failureEnvelope(error);
      overviewEnvelope.set(envelope);
      summarizeEnvelope("Overview inspection", envelope, "overview-dashboard", () => loadOverview(selector));
    }
  } finally {
    if (epoch === overviewEpoch) {
      overviewLoading.set(false);
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
      event: currentOperation.event || { message: "Operation running" },
    });
  } else if (!data?.activeOperation && !isActiveSession) {
    setStatusOperation(null);
  }
  if (data?.state === "stale" || data?.state === "error") {
    clearSharedCredentialInventory(data?.selectedSelector || get(selectedSelector));
    const logEntryId = appendLogEntry({
      tone: "error",
      source: "session",
      title: "Session needs attention",
      message: data.error?.hint || data.error?.message || "Open the selected session again or refresh devices.",
      selector: data.selectedSelector || get(selectedSelector),
      data: {
        session: { state: data.state, activeOperation: data.activeOperation, error: data.error },
      },
    });
    setStatusOutcome({
      tone: "error",
      title: "Session needs attention",
      message: data.error?.hint || data.error?.message || "Open the selected session again or refresh devices.",
      logEntryId,
    });
  }
}

export function handleInteractionRequested(data: any) {
  pendingInteraction.set(data);
  appendLogEntry({
    tone: "warning",
    source: "operation-interaction",
    title: "Interaction required",
    message: operationStageLabel("interaction-required"),
    operationId: data?.operationId,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      operationId: data?.operationId,
      interactionId: data?.interactionId,
      request: {
        type: data?.request?.type || data?.request?.kind || data?.request?.prompt || "interaction",
      },
    },
  });
}
