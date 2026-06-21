import { get } from "svelte/store";
import { OperationKind, type OperationEvent } from "../../bindings/github.com/go-ctap/kit/model";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import {
  InspectEnvelope,
  RuntimeErrorEnvelope,
  type InteractionPrompt,
  type InteractionAnswer,
  type OperationEventEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import {
  api,
  idleSessionStatus,
  reportForSelector,
  runtimeErrorFrom,
  selectorFromDevice,
  sessionIsOpen,
  sessionMatches,
  statusFromSession,
  type Discovery,
  type Envelope,
  type SessionStatus,
} from "./api";
import { operationStageLabel } from "./format";
import { m } from "../paraglide/messages.js";
import {
  activeScreen,
  appendLogEntry,
  appError,
  applyDiscovery,
  applyEnvelope,
  beginOperation,
  clearWorkbenchScreenCaches,
  devices as deviceStore,
  finishOperation,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSLookup,
  overviewMDSLoading,
  pendingInteraction,
  selectedSelector,
  sessions,
  sessionStatus,
  statusBar,
  setStatusOperation,
  setStatusOutcome,
  summarizeEnvelope,
  type MDSLookupViewState,
} from "./stores";
import { inspectResult, operationError } from "./ctapkit-results.js";

let lifecycleEpoch = 0;
let overviewEpoch = 0;
let mdsEpoch = 0;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || m.unexpected_error());
}

function failureMDSLookup(error: unknown): MDSLookupViewState {
  return { error: runtimeErrorFrom(error) };
}

function failureEnvelope(error: unknown): Envelope {
  return new InspectEnvelope({ kind: OperationKind.OperationInspect, error: runtimeErrorFrom(error) });
}

function inspectResultFromEnvelope(envelope: Envelope) {
  const result = inspectResult(envelope);
  if (!result) throw new Error("inspect result is required");
  return result;
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

function deviceSelection(devices: DeviceReport[], requestedSelector: string) {
  const device = reportForSelector(devices, requestedSelector);
  return {
    selectedDevice: device,
    selectedSelector: selectorFromDevice(device),
  };
}

function initialSelectorForDevices(devices: DeviceReport[], preferredSelector: string) {
  if (reportForSelector(devices, preferredSelector)) return preferredSelector;
  return devices.length === 1 ? selectorFromDevice(devices[0]) : "";
}

function retainedSelectorForDevices(devices: DeviceReport[], preferredSelector: string) {
  return reportForSelector(devices, preferredSelector) ? preferredSelector : "";
}

function discoverySnapshot(
  devices: DeviceReport[],
  selectedSelector: string,
  selectedDevice: DeviceReport | null,
  session: SessionStatus,
  error?: RuntimeErrorEnvelope | null,
): Discovery {
  const discovery: Discovery = {
    devices,
    selectedSelector,
    selectedDevice,
    session,
  };
  if (error) discovery.error = error;
  return discovery;
}

function activeOperationId() {
  return get(statusBar).activeOperation?.operationId || get(pendingInteraction)?.operationId || "";
}

async function cancelActiveOperation() {
  const operationId = activeOperationId();
  if (!operationId) return;
  try {
    await api.cancelOperation({ operationId });
  } catch {
    // Closing the session remains the authoritative cleanup boundary.
  }
}

async function cancelPendingInteraction() {
  try {
    await answerPendingInteraction({ confirmed: false, canceled: true });
  } catch {
    pendingInteraction.set(null);
  }
}

async function closeOpenSessions() {
  await cancelActiveOperation();
  await cancelPendingInteraction();
  const snapshots = await api.sessions();
  if (snapshots.some(sessionIsOpen)) {
    await api.closeAllSessions();
  }
  finishOperation();
}

async function openSessionForDevice(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, selector);
  if (!canonicalSelector || !selectedDevice) {
    await closeOpenSessions();
    return discoverySnapshot(devices, "", null, idleSessionStatus("", null));
  }

  const snapshots = await api.sessions();
  const openSessions = snapshots.filter(sessionIsOpen);
  const current = openSessions.find((snapshot) => sessionMatches(snapshot, canonicalSelector));
  if (current && openSessions.length === 1) {
    return discoverySnapshot(devices, canonicalSelector, current.info.device, statusFromSession(current));
  }

  await closeOpenSessions();
  const snapshot = await api.openSession({ selector: canonicalSelector });
  return discoverySnapshot(devices, canonicalSelector, snapshot.info.device, statusFromSession(snapshot));
}

async function closeSelection(devices: DeviceReport[] = get(deviceStore)): Promise<Discovery> {
  await closeOpenSessions();
  return discoverySnapshot(devices, "", null, idleSessionStatus("", null));
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

function selectionMessage(discovery: Discovery, fallback: string) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : fallback || m.selection_updated();
}

function selectedDeviceSummary(discovery: Discovery) {
  const device = discovery.selectedDevice;
  return device ? device.product || device.deviceId : undefined;
}

async function selectFromDevices(devices: DeviceReport[], selector: string): Promise<Discovery> {
  const requestedSelector = selector.trim();
  if (!requestedSelector) return closeSelection(devices);

  const { selectedSelector: canonicalSelector, selectedDevice } = deviceSelection(devices, requestedSelector);
  if (!canonicalSelector || !selectedDevice) return closeSelection(devices);

  try {
    return await openSessionForDevice(devices, canonicalSelector);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    return discoverySnapshot(
      devices,
      canonicalSelector,
      selectedDevice,
      idleSessionStatus(canonicalSelector, selectedDevice, "error", runtimeError),
      runtimeError,
    );
  }
}

async function discoverAndSelect(preferredSelector: string, autoSelectSingle = false): Promise<Discovery> {
  const discoveredDevices = await api.discover();
  const selector = autoSelectSingle
    ? initialSelectorForDevices(discoveredDevices, preferredSelector)
    : retainedSelectorForDevices(discoveredDevices, preferredSelector);
  return selectFromDevices(discoveredDevices, selector);
}

export async function bootstrap() {
  const epoch = ++lifecycleEpoch;
  try {
    const discovery = await discoverAndSelect(get(selectedSelector), true);
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
    const discovery = await discoverAndSelect(previous);
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
  clearWorkbenchScreenCaches();
  try {
    if (selector.trim()) {
      const device = reportForSelector(get(deviceStore), selector);
      sessionStatus.set(idleSessionStatus(selector.trim(), device, "opening"));
    }
    const discovery = await selectFromDevices(get(deviceStore), selector);
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

export async function answerPendingInteraction(answer: Omit<InteractionAnswer, "interactionId">) {
  const prompt = get(pendingInteraction);
  if (!prompt) {
    pendingInteraction.set(null);
    return false;
  }

  try {
    return await api.resolveInteraction({
      ...answer,
      interactionId: prompt.interactionId,
    });
  } finally {
    pendingInteraction.set(null);
  }
}

export async function shutdownWorkbench() {
  try {
    await closeOpenSessions();
  } finally {
    const selector = get(selectedSelector);
    sessions.set([]);
    sessionStatus.set(idleSessionStatus(selector, reportForSelector(get(deviceStore), selector), selector ? "closed" : "idle"));
    pendingInteraction.set(null);
    finishOperation();
  }
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

  const epoch = ++overviewEpoch;
  mdsEpoch++;
  overviewLoading.set(true);
  overviewBioSensorEnvelope.set(null);
  overviewMDSLookup.set(null);
  overviewMDSLoading.set(false);
  try {
    beginOperation(m.overview_inspection(), "overview-dashboard");
    const sessionId = selectedSessionId();
    const envelope = await api.inspect({ sessionId });
    if (epoch !== overviewEpoch || selector !== get(selectedSelector)) return;
    overviewEnvelope.set(envelope);
    applyEnvelope(envelope);
    const aaguid = !operationError(envelope) ? aaguidFromEnvelope(envelope) : "";
    if (aaguid) {
      void loadOverviewMDS(aaguid, false, selector);
    }
    if (!operationError(envelope) && shouldLoadBioSensor(envelope)) {
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
    applySessionError(envelope.error);
    if (operationError(envelope)) {
      appError.set(null);
    }
  } catch (error) {
    if (epoch === overviewEpoch && selector === get(selectedSelector)) {
      const envelope = failureEnvelope(error);
      overviewEnvelope.set(envelope);
      overviewBioSensorEnvelope.set(null);
      summarizeEnvelope(m.overview_inspection(), envelope, "overview-dashboard", () => loadOverview(selector));
      applySessionError(envelope.error);
    }
  } finally {
    if (epoch === overviewEpoch) {
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
  const epoch = ++mdsEpoch;
  if (!aaguid || !selector) {
    overviewMDSLookup.set(null);
    overviewMDSLoading.set(false);
    return;
  }

  overviewMDSLoading.set(true);
  try {
    const envelope = await api.lookupMDS({ aaguid, refresh });
    if (epoch !== mdsEpoch || selector !== get(selectedSelector)) return;
    overviewMDSLookup.set({ result: envelope.result });
  } catch (error) {
    if (epoch === mdsEpoch && selector === get(selectedSelector)) {
      overviewMDSLookup.set(failureMDSLookup(error));
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
