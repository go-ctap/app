import type { LookupResult } from "../../../bindings/github.com/go-ctap/mds/model";
import { Code, type Failure } from "../../../bindings/github.com/go-ctap/kit/model/failure";
import type { DeviceReport } from "../../../bindings/github.com/go-ctap/kit/model/report";
import type {
  BioSensorEnvelope,
  CredentialsEnvelope,
  InspectEnvelope,
  InteractionPrompt,
  LargeBlobListEnvelope,
} from "../../../bindings/telesma/service";

import {
  resetInteractionStateForTest,
  pendingInteraction,
} from "$lib/features/interaction/state.js";
import { resetLabStateForTest } from "$lib/features/lab/state.js";
import {
  completeLargeBlobsInventoryLoad,
  emptyLargeBlobsInventoryState,
  largeBlobsInventoryState,
  resetLargeBlobsStateForTest,
} from "$lib/features/largeblobs/state.js";
import {
  errorLoadState,
  idleLoadState,
  overviewBioSensor,
  overviewMDS,
  readyLoadState,
  resetOverviewDeviceState,
} from "$lib/features/overview/state.js";
import {
  completePasskeysInventoryLoad,
  emptyPasskeysInventoryState,
  passkeysInventoryState,
  resetPasskeysStateForTest,
} from "$lib/features/passkeys/state.js";
import { credentialsReport } from "$lib/ctapkit-results.js";
import {
  authenticatorInspection,
  devices,
  selectedDevice,
  selectedSelector,
  authenticatorStatus,
  resetAuthenticatorStateForTest,
} from "$lib/features/authenticator/state.js";
import { resetSecurityDeviceState } from "$lib/features/security/state.js";
import { cancelOperationRecovery } from "$lib/operation-recovery.js";
import { activeScreen, resetWorkbenchStateForTest } from "$lib/features/workbench/state.js";
import type { AuthenticatorStatus } from "$lib/authenticator-model.js";
import type { ActiveScreen } from "$lib/features/workbench";

export function resetAppStateForTest() {
  cancelOperationRecovery();
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetInteractionStateForTest();
  resetOverviewDeviceState();
  resetPasskeysStateForTest();
  resetLargeBlobsStateForTest();
  resetLabStateForTest();
  resetSecurityDeviceState();
}

export function seedActiveScreenForTest(screen: ActiveScreen) {
  activeScreen.set(screen);
}

export function seedDevicesForTest(items: DeviceReport[]) {
  devices.set(items);
}

export function seedSelectionForTest(
  selector: string,
  device: DeviceReport | null,
  authenticator: AuthenticatorStatus,
) {
  selectedSelector.set(selector);
  selectedDevice.set(device);
  authenticatorStatus.set(authenticator);
}

export function seedPendingInteractionForTest(prompt: InteractionPrompt | null) {
  pendingInteraction.set(prompt);
}

export function seedOverviewEnvelopeForTest(envelope: InspectEnvelope | null) {
  if (!envelope) {
    authenticatorInspection.set(idleLoadState());

    return;
  }

  authenticatorInspection.set(
    envelope.error ? errorLoadState(envelope.error, envelope) : readyLoadState(envelope),
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

export function seedPasskeysEnvelopeForTest(
  envelope: CredentialsEnvelope | null,
  error?: Failure | null,
) {
  if (error) {
    passkeysInventoryState.set({
      ...emptyPasskeysInventoryState(),
      phase: "error",
      report: envelope?.result ?? null,
    });

    return;
  }

  if (!envelope) {
    passkeysInventoryState.set(emptyPasskeysInventoryState());

    return;
  }

  const report = credentialsReport(envelope);

  if (report) {
    completePasskeysInventoryLoad(report, "2026-06-22T00:00:00.000Z");

    return;
  }

  passkeysInventoryState.set({
    ...emptyPasskeysInventoryState(),
    phase:
      envelope.error?.code === Code.CodeCredentialManagementUnsupported ? "unsupported" : "error",
  });
}

export function seedLargeBlobsEnvelopeForTest(
  envelope: LargeBlobListEnvelope | null,
  error?: Failure | null,
) {
  if (error) {
    largeBlobsInventoryState.set({
      ...emptyLargeBlobsInventoryState(),
      phase: "error",
      report: envelope?.result ?? null,
    });

    return;
  }

  if (!envelope) {
    largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());

    return;
  }

  if (envelope.result) {
    completeLargeBlobsInventoryLoad(envelope.result, "2026-06-22T00:00:00.000Z");

    return;
  }

  largeBlobsInventoryState.set({
    ...emptyLargeBlobsInventoryState(),
    phase: envelope.error?.code === Code.CodeLargeBlobUnsupported ? "unsupported" : "error",
  });
}
