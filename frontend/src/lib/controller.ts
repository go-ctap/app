import { get } from "svelte/store";
import { api, operationFailed, type Envelope } from "./api";
import {
  activeScreen,
  appError,
  applyDiscovery,
  applyEnvelope,
  overviewEnvelope,
  overviewLoading,
  pendingInteraction,
  selectedSelector,
  sessionStatus,
  setStatusOperation,
  setStatusOutcome,
  summarizeEnvelope,
} from "./stores";

let lifecycleEpoch = 0;
let overviewEpoch = 0;
let operationClearTimer: number | undefined;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unexpected error");
}

function failureEnvelope(error: unknown): Envelope {
  return { error: { message: messageFromError(error) } };
}

function terminalStage(stage: string | undefined) {
  return Boolean(stage?.includes("completed") || stage?.includes("failed") || stage?.includes("canceled"));
}

function shouldAutoLoadOverview() {
  return get(activeScreen) === "overview" && Boolean(get(selectedSelector));
}

export async function bootstrap() {
  const epoch = ++lifecycleEpoch;
  try {
    const status = await api.sessionStatus();
    if (epoch !== lifecycleEpoch) return;
    sessionStatus.set(status);
    if (status.state === "error" || status.state === "stale") {
      setStatusOutcome({
        tone: "error",
        title: "Session needs attention",
        message: status.error?.hint || status.error?.message || "Refresh discovery or clear the selected session.",
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
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? "Discovery issue" : "Discovery refreshed",
      message: discovery.error ? discovery.error.message : `${discovery.devices?.length || 0} authenticator(s) found.`,
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
    setStatusOutcome({
      tone: discovery.error ? "error" : "info",
      title: discovery.error ? "Token selection issue" : "Token selected",
      message: discovery.selectedDevice?.product || discovery.selectedDevice?.deviceId || selector || "Selection updated.",
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
    sessionStatus.set(await api.lockSession());
    setStatusOutcome({ tone: "info", title: "Session cleared", message: "The cached authenticator session was closed." });
  } catch (error) {
    appError.set(messageFromError(error));
    setStatusOutcome({ tone: "error", title: "Could not clear session", message: messageFromError(error) });
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
  if (operationClearTimer !== undefined) {
    clearTimeout(operationClearTimer);
    operationClearTimer = undefined;
  }

  if (!data?.operationId) {
    setStatusOperation(null);
    return;
  }

  setStatusOperation(data);
  if (terminalStage(data.event?.stage)) {
    const failed = data.event?.stage?.includes("failed");
    const canceled = data.event?.stage?.includes("canceled");
    setStatusOutcome({
      tone: failed ? "error" : canceled ? "warning" : "success",
      title: data.event?.message || (failed ? "Operation failed" : canceled ? "Operation canceled" : "Operation complete"),
      message: data.event?.stage,
    });
    operationClearTimer = window.setTimeout(() => setStatusOperation(null), 1800);
  }
}

export function handleSessionChanged(data: any) {
  sessionStatus.set(data);
  if (data?.state === "stale" || data?.state === "error") {
    setStatusOutcome({
      tone: "error",
      title: "Session needs attention",
      message: data.error?.hint || data.error?.message || "Refresh discovery or clear the selected session.",
    });
  } else if (data?.state === "ready") {
    setStatusOutcome({ tone: "info", title: "Session ready", message: "Authenticator session is available." });
  }
}

export function handleInteractionRequested(data: any) {
  pendingInteraction.set(data);
}
