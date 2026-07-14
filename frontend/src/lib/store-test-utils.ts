import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  BioSensorEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  InteractionPrompt,
  LargeBlobListEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import { resetInteractionStateForTest, pendingInteraction } from "./features/interaction/state.js";
import { resetLabStateForTest } from "./features/lab/state.js";
import {
  completeLargeBlobsInventoryLoad,
  emptyLargeBlobsInventoryState,
  largeBlobsInventoryState,
  resetLargeBlobsStateForTest,
} from "./features/largeblobs/state.js";
import {
  errorLoadState,
  idleLoadState,
  overviewBioSensor,
  overviewInspection,
  overviewMDS,
  readyLoadState,
  resetOverviewStateForTest,
} from "./features/overview/state.js";
import {
  completePasskeysInventoryLoad,
  emptyPasskeysInventoryState,
  passkeysInventoryState,
  resetPasskeysStateForTest,
} from "./features/passkeys/state.js";
import {
  devices,
  selectedDevice,
  selectedSelector,
  sessionStatus,
  resetSessionStateForTest,
} from "./features/session/state.js";
import { resetSecurityStateForTest } from "./features/security/state.js";
import {
  activeScreen,
  resetWorkbenchStateForTest,
} from "./features/workbench/state.js";
import type { SessionStatus } from "./session-model.js";
import type { ActiveScreen } from "./stores.js";

export function resetAppStateForTest() {
  resetSessionStateForTest();
  resetWorkbenchStateForTest();
  resetInteractionStateForTest();
  resetLabStateForTest();
  resetOverviewStateForTest();
  resetPasskeysStateForTest();
  resetLargeBlobsStateForTest();
  resetSecurityStateForTest();
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

export function seedOverviewEnvelopeForTest(envelope: InspectEnvelope | null) {
  if (!envelope) {
    overviewInspection.set(idleLoadState());
    return;
  }
  overviewInspection.set(
    envelope.error
      ? errorLoadState(envelope.error, envelope)
      : readyLoadState(envelope),
  );
}

export function seedOverviewBioSensorEnvelopeForTest(envelope: BioSensorEnvelope | null) {
  overviewBioSensor.set(envelope ? readyLoadState(envelope) : idleLoadState());
}

export function seedOverviewMDSForTest(data: LookupResult | null, error?: Failure | null) {
  if (error) {
    overviewMDS.set({ state: "error", data, error });
    return;
  }
  if (!data) {
    overviewMDS.set(idleLoadState());
    return;
  }
  overviewMDS.set(readyLoadState(data));
}

export function seedPasskeysEnvelopeForTest(envelope: CredentialsEnvelope | null, error?: Failure | null) {
  if (error) {
    passkeysInventoryState.set({
      ...emptyPasskeysInventoryState(),
      phase: "error",
      lastSuccessfulEnvelope: envelope,
      runtimeError: error,
    });
    return;
  }
  if (!envelope) {
    passkeysInventoryState.set(emptyPasskeysInventoryState());
    return;
  }
  completePasskeysInventoryLoad(envelope, "2026-06-22T00:00:00.000Z");
}

export function seedLargeBlobsEnvelopeForTest(envelope: LargeBlobListEnvelope | null, error?: Failure | null) {
  if (error) {
    largeBlobsInventoryState.set({
      ...emptyLargeBlobsInventoryState(),
      phase: "error",
      lastSuccessfulEnvelope: envelope,
      runtimeError: error,
    });
    return;
  }
  if (!envelope) {
    largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
    return;
  }
  completeLargeBlobsInventoryLoad(envelope, "2026-06-22T00:00:00.000Z");
}
