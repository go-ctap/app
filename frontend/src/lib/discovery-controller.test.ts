import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IdentityResolutionState,
  Vendor,
  type DeviceReport,
} from "../../bindings/github.com/go-ctap/kit/model/report";
import { InventoryTrigger } from "../../bindings/github.com/go-ctap/kit";
import type {
  CredentialsEnvelope,
  DiscoveryChangedEnvelope,
  InspectEnvelope,
  InteractionPrompt,
  LargeBlobListEnvelope,
  ActiveSelection,
} from "../../bindings/telesma/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";
import { InteractionKind, OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";

import { setAppLocale } from "$lib/i18n";
import {
  cancelOperationRecovery,
  offerOperationRecovery,
  operationRecovery,
} from "$lib/operation-recovery";
import { failureForCode } from "$lib/test-support/failure";
import { testSmartCardDevice } from "../test/device.js";

import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedLargeBlobsEnvelopeForTest,
  seedOverviewEnvelopeForTest,
  seedPasskeysEnvelopeForTest,
  seedPendingInteractionForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils.js";
import {
  devices,
  largeBlobsInventoryState,
  authenticatorInspection,
  passkeysInventoryState,
  pendingInteraction,
  selectedDevice,
  selectedSelector,
  authenticatorStatus,
  statusBar,
} from "$lib/test-support/stores.js";

const serviceMocks = vi.hoisted(() => ({
  Inspect: vi.fn(),
  ListCredentials: vi.fn(),
  SetSelection: vi.fn(),
}));

vi.mock("../../bindings/telesma/ctapservice/service", () => serviceMocks);

function device(id: string, product = id): DeviceReport {
  return {
    attachment: {
      id,
      transport: Mode.ModeHID,
      usb: { product, vendorId: 1, productId: 2 },
    },
    identityResolution: { state: IdentityResolutionState.IdentityUnavailable },
  };
}

function event(
  snapshot: { devices: DeviceReport[] },
  error: DiscoveryChangedEnvelope["error"] = undefined,
  trigger = InventoryTrigger.InventoryTriggerTopology,
): DiscoveryChangedEnvelope {
  return {
    trigger,
    snapshot,
    ...(error ? { error } : {}),
  };
}

function seedSelected(token: DeviceReport, state: "ready" | "running" = "ready") {
  seedDevicesForTest([token]);
  seedSelectionForTest(token.attachment.id, token, {
    state,
    selectionId: `authenticator-${token.attachment.id}`,
  });
}

function snapshot(token: DeviceReport): ActiveSelection {
  return {
    id: `authenticator-${token.attachment.id}`,
  } as ActiveSelection;
}

describe("discovery controller", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
  });

  it("auto-selects a late authenticator when none were available", async () => {
    const token = device("token-1");
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedActiveScreenForTest("settings");
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token) });

    await handleDiscoveryChanged(event({ devices: [token] }));

    expect(get(devices)).toEqual([token]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(selectedDevice)).toEqual(token);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ attachmentId: "token-1" });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Token selected",
    });
  });

  it("auto-selects the first when several authenticators appear after none", async () => {
    const first = device("token-1");
    const second = device("token-2");
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedActiveScreenForTest("settings");
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(first) });

    await handleDiscoveryChanged(event({ devices: [first, second] }));

    expect(get(devices)).toEqual([first, second]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(selectedDevice)).toEqual(first);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ attachmentId: "token-1" });
  });

  it("opens a reappearing card when selection is empty but the previous inventory was not", async () => {
    const original = testSmartCardDevice("card-1");
    const retainedInventory = device("other-token");
    const reattached = testSmartCardDevice("card-2");

    seedDevicesForTest([original]);
    seedSelectionForTest(original.attachment.id, original, {
      state: "ready",
      selectionId: "authenticator-card-1",
    });

    const decision = offerOperationRecovery(
      "Create credential",
      failureForCode(Code.CodeUserPresenceRequired),
    );

    seedDevicesForTest([retainedInventory]);
    seedSelectionForTest("", null, { state: "idle" });
    seedActiveScreenForTest("lab");

    let finishSelection!: (value: { selection: ActiveSelection }) => void;

    serviceMocks.SetSelection.mockReturnValue(
      new Promise((resolve) => {
        finishSelection = resolve;
      }),
    );

    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");
    const opening = handleDiscoveryChanged(event({ devices: [retainedInventory, reattached] }));

    await vi.waitFor(() => {
      expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ attachmentId: "card-2" });
      expect(get(operationRecovery)).toMatchObject({
        cardVisible: true,
        opening: true,
        canRetry: false,
      });
    });
    finishSelection({ selection: snapshot(reattached) });
    await opening;

    expect(get(selectedSelector)).toBe("card-2");
    expect(get(selectedDevice)).toEqual(reattached);
    expect(get(operationRecovery)).toMatchObject({
      label: "Create credential",
      opening: false,
      canRetry: true,
    });
    expect(serviceMocks.Inspect).not.toHaveBeenCalled();
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
    cancelOperationRecovery();
    await expect(decision).resolves.toBe("cancel");
  });

  it("switches from a retained HID authenticator to a reappearing smart card during recovery", async () => {
    const original = testSmartCardDevice("card-1");
    const retained = device("other-token");
    const reattached = testSmartCardDevice("card-2");

    seedDevicesForTest([original]);
    seedSelectionForTest(original.attachment.id, original, {
      state: "ready",
      selectionId: "authenticator-card-1",
    });

    const decision = offerOperationRecovery(
      "Create credential",
      failureForCode(Code.CodeUserPresenceRequired),
    );

    seedActiveScreenForTest("passkeys");
    serviceMocks.SetSelection.mockImplementation(({ attachmentId }) => {
      const selected = attachmentId === retained.attachment.id ? retained : reattached;

      return Promise.resolve({ selection: snapshot(selected) });
    });

    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    await handleDiscoveryChanged(event({ devices: [retained] }));
    expect(get(selectedDevice)).toEqual(retained);
    expect(get(operationRecovery)).toMatchObject({ wrongDevice: true });

    await handleDiscoveryChanged(event({ devices: [retained, reattached] }));
    expect(get(selectedDevice)).toEqual(reattached);
    expect(get(operationRecovery)).toMatchObject({ canRetry: true });
    expect(serviceMocks.SetSelection.mock.calls.map(([request]) => request.attachmentId)).toEqual([
      "other-token",
      "card-2",
    ]);
    expect(serviceMocks.Inspect).not.toHaveBeenCalled();
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();

    cancelOperationRecovery();
    await expect(decision).resolves.toBe("cancel");
  });

  it("preserves the selected authenticator and screen state when its device remains", async () => {
    const original = device("token-1", "Original");
    const refreshed = device("token-1", "Refreshed");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1", result: {} } as CredentialsEnvelope;
    const largeBlobReport = {} as NonNullable<LargeBlobListEnvelope["result"]>;
    const largeBlobs = {
      operationId: "large-blobs-1",
      result: largeBlobReport,
    } as LargeBlobListEnvelope;
    const prompt = {
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt;
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedSelected(original);
    seedOverviewEnvelopeForTest(inspection);
    seedPasskeysEnvelopeForTest(inventory);
    seedLargeBlobsEnvelopeForTest(largeBlobs);
    seedPendingInteractionForTest(prompt);

    handleDiscoveryChanged(event({ devices: [refreshed] }));

    expect(get(selectedSelector)).toBe("token-1");
    expect(get(selectedDevice)?.attachment.usb?.product).toBe("Refreshed");
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    expect(get(authenticatorInspection).data).toBe(inspection);
    expect(get(passkeysInventoryState).report).toBe(inventory.result);
    expect(get(largeBlobsInventoryState).report).toBe(largeBlobReport);
    expect(get(pendingInteraction)).toBe(prompt);
  });

  it("applies enriched metadata without replacing the current status outcome", async () => {
    const original = device("token-1", "Security Key");
    const enriched: DeviceReport = {
      ...original,
      identity: {
        vendor: Vendor.VendorYubico,
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
      },
      identityResolution: {
        state: IdentityResolutionState.IdentityResolved,
        provider: Vendor.VendorYubico,
      },
    };
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedSelected(original);

    handleDiscoveryChanged(event({ devices: [original] }));

    const outcome = get(statusBar).lastOutcome;

    handleDiscoveryChanged(
      event({ devices: [enriched] }, undefined, InventoryTrigger.InventoryTriggerIdentity),
    );

    expect(get(devices)).toEqual([enriched]);
    expect(get(selectedDevice)).toEqual(enriched);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    expect(get(statusBar).lastOutcome).toBe(outcome);
  });

  it("preserves enrichment that arrives while the first authenticator is opening", async () => {
    const original = device("token-1", "Security Key");
    const enriched: DeviceReport = {
      ...original,
      identity: {
        vendor: Vendor.VendorYubico,
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
      },
      identityResolution: {
        state: IdentityResolutionState.IdentityResolved,
        provider: Vendor.VendorYubico,
      },
    };
    let finishSelection!: (value: { selection: ActiveSelection }) => void;

    serviceMocks.SetSelection.mockReturnValue(
      new Promise((resolve) => {
        finishSelection = resolve;
      }),
    );

    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedActiveScreenForTest("settings");

    const opening = handleDiscoveryChanged(event({ devices: [original] }));

    await vi.waitFor(() => {
      expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ attachmentId: "token-1" });
    });

    await handleDiscoveryChanged(
      event({ devices: [enriched] }, undefined, InventoryTrigger.InventoryTriggerIdentity),
    );
    finishSelection({ selection: snapshot(original) });
    await opening;

    expect(get(devices)).toEqual([enriched]);
    expect(get(selectedDevice)).toEqual(enriched);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
  });

  it("removes an unselected authenticator without disturbing the selected authenticator", async () => {
    const selected = device("token-1");
    const unselected = device("token-2");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedDevicesForTest([selected, unselected]);
    seedSelectionForTest(selected.attachment.id, selected, {
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    seedOverviewEnvelopeForTest(inspection);

    handleDiscoveryChanged(event({ devices: [selected] }));

    expect(get(devices)).toEqual([selected]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(authenticatorStatus).selectionId).toBe("authenticator-token-1");
    expect(get(authenticatorInspection).data).toBe(inspection);
  });

  it("selects the first remaining authenticator when the selected one disappears", async () => {
    const selected = device("token-1");
    const remaining = device("token-2");
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedSelected(selected);
    seedActiveScreenForTest("settings");
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(remaining) });

    await handleDiscoveryChanged(event({ devices: [remaining] }));

    expect(get(devices)).toEqual([remaining]);
    expect(get(selectedSelector)).toBe("token-2");
    expect(get(selectedDevice)).toEqual(remaining);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-2",
    });
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ attachmentId: "token-2" });
  });

  it("clears running and interaction state when the selected authenticator disappears", async () => {
    const token = device("token-1");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1" } as CredentialsEnvelope;
    const largeBlobs = { operationId: "large-blobs-1" } as LargeBlobListEnvelope;
    const { handleDiscoveryChanged, handleOperationProgress } =
      await import("$lib/test-support/controller.js");

    seedSelected(token, "running");
    seedOverviewEnvelopeForTest(inspection);
    seedPasskeysEnvelopeForTest(inventory);
    seedLargeBlobsEnvelopeForTest(largeBlobs);
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);
    handleOperationProgress({
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      event: { stage: OperationStage.OperationStageInteractionRequired, message: "Touch the key" },
    });

    handleDiscoveryChanged(event({ devices: [] }));

    expect(get(devices)).toEqual([]);
    expect(get(selectedSelector)).toBe("");
    expect(get(selectedDevice)).toBeNull();
    expect(get(authenticatorStatus)).toMatchObject({ state: "idle" });
    expect(get(authenticatorStatus).selectionId).toBeUndefined();
    expect(get(pendingInteraction)).toBeNull();
    expect(get(authenticatorInspection).data).toBeNull();
    expect(get(passkeysInventoryState).report).toBeNull();
    expect(get(largeBlobsInventoryState).report).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      title: "Selected authenticator disconnected",
    });
  });

  it("keeps the authenticator when a failed monitor reports the last snapshot", async () => {
    const token = device("token-1");
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedSelected(token);

    handleDiscoveryChanged(event({ devices: [token] }, failureForCode(Code.CodeTransportFailure)));

    expect(get(devices)).toEqual([token]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(authenticatorStatus).selectionId).toBe("authenticator-token-1");
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "Communication with the authenticator failed.",
    });
  });

  it("keeps an identical snapshot and current authenticator without clearing caches", async () => {
    const token = device("token-1");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const { handleDiscoveryChanged } = await import("$lib/discovery-controller.js");

    seedSelected(token);
    seedOverviewEnvelopeForTest(inspection);

    handleDiscoveryChanged(event({ devices: [token] }));

    expect(get(authenticatorStatus).selectionId).toBe("authenticator-token-1");
    expect(get(authenticatorInspection).data).toBe(inspection);
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "info" });
  });
});
