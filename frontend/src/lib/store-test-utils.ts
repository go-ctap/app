import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import type { SessionStatus } from "./api.js";
import type { OperationEnvelope } from "./api.js";
import { resetInteractionStateForTest, pendingInteraction } from "./features/interaction/state.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessionStatus,
  resetSessionStateForTest,
} from "./features/session/state.js";
import {
  idleLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
  readyLoadState,
  type MDSLookupViewState,
  resetOverviewStateForTest,
} from "./features/overview/state.js";
import {
  activeScreen,
  resetWorkbenchStateForTest,
} from "./features/workbench/state.js";
import type { ActiveScreen } from "./stores.js";

export function resetAppStateForTest() {
  resetSessionStateForTest();
  resetWorkbenchStateForTest();
  resetInteractionStateForTest();
  resetOverviewStateForTest();
}

export function seedActiveScreenForTest(screen: ActiveScreen) {
  activeScreen.set(screen);
}

export function seedDevicesForTest(items: DeviceReport[]) {
  devices.set(items);
}

export function seedSelectionForTest(selector: string, device: DeviceReport | null, session: SessionStatus) {
  selectedSelector.set(selector);
  selectedDevice.set(device);
  sessionStatus.set(session);
}

export function seedPendingInteractionForTest(prompt: InteractionPrompt | null) {
  pendingInteraction.set(prompt);
}

export function seedOverviewEnvelopeForTest(envelope: OperationEnvelope | null) {
  overviewInspection.set(envelope ? readyLoadState(envelope) : idleLoadState());
}

export function seedOverviewBioSensorEnvelopeForTest(envelope: OperationEnvelope | null) {
  overviewBioSensor.set(envelope ? readyLoadState(envelope) : idleLoadState());
}

export function seedOverviewMDSForTest(view: MDSLookupViewState | null) {
  if (!view) {
    overviewMDS.set(idleLoadState());
    return;
  }
  if (view.error) {
    overviewMDS.set({ state: "error", data: view.result ?? null, error: view.error });
    return;
  }
  overviewMDS.set(readyLoadState(view.result ?? null));
}
