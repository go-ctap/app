import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  CredentialsEnvelope,
  DiscoveryChangedEnvelope,
  InspectEnvelope,
  InteractionPrompt,
  LargeBlobListEnvelope,
  ActiveSelection,
} from "../../bindings/fidobench/service";
import { DiscoveryTrigger } from "../../bindings/fidobench/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";
import { InteractionKind, OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";

import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";

import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedLargeBlobsEnvelopeForTest,
  seedOverviewEnvelopeForTest,
  seedPasskeysEnvelopeForTest,
  seedPendingInteractionForTest,
  seedSelectionForTest,
} from "./store-test-utils.js";
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
} from "./test-support/stores.js";

const serviceMocks = vi.hoisted(() => ({
  SetSelection: vi.fn(),
  RefreshDiscovery: vi.fn(),
  StartDiscoveryMonitoring: vi.fn(),
}));

vi.mock("../../bindings/fidobench/ctapkitservice", () => serviceMocks);

function device(id: string, product = id): DeviceReport {
  return {
    fingerprint: id,
    ordinalAlias: id,
    transport: Mode.ModeHID,
    path: id,
    vendorId: 1,
    productId: 2,
    vendor: Vendor.VendorUnknown,
    product,
  };
}

function event(
  snapshot: { devices: DeviceReport[] } | null,
  error: DiscoveryChangedEnvelope["error"] = null,
  trigger = "hotplug",
): DiscoveryChangedEnvelope {
  return {
    trigger,
    snapshot,
    error,
  } as DiscoveryChangedEnvelope;
}

function seedSelected(token: DeviceReport, state: "ready" | "running" = "ready") {
  seedDevicesForTest([token]);
  seedSelectionForTest(token.fingerprint, token, {
    state,
    selectionId: `authenticator-${token.fingerprint}`,
  });
}

function snapshot(token: DeviceReport): ActiveSelection {
  return {
    id: `authenticator-${token.fingerprint}`,
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
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
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
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Token selected",
    });
  });

  it("auto-selects the first when several authenticators appear after none", async () => {
    const first = device("token-1");
    const second = device("token-2");
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedActiveScreenForTest("settings");
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(first) });

    await handleDiscoveryChanged(event({ devices: [first, second] }));

    expect(get(devices)).toEqual([first, second]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(selectedDevice)).toEqual(first);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
  });

  it("preserves the selected authenticator and screen state when its device remains", async () => {
    const original = device("token-1", "Original");
    const refreshed = device("token-1", "Refreshed");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1" } as CredentialsEnvelope;
    const largeBlobs = { operationId: "large-blobs-1" } as LargeBlobListEnvelope;
    const prompt = {
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt;
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(original);
    seedOverviewEnvelopeForTest(inspection);
    seedPasskeysEnvelopeForTest(inventory);
    seedLargeBlobsEnvelopeForTest(largeBlobs);
    seedPendingInteractionForTest(prompt);

    handleDiscoveryChanged(event({ devices: [refreshed] }));

    expect(get(selectedSelector)).toBe("token-1");
    expect(get(selectedDevice)?.product).toBe("Refreshed");
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    expect(get(authenticatorInspection).data).toBe(inspection);
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(inventory);
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).toBe(largeBlobs);
    expect(get(pendingInteraction)).toBe(prompt);
  });

  it("applies enriched metadata without replacing the current status outcome", async () => {
    const original = device("token-1", "Security Key");
    const enriched: DeviceReport = {
      ...original,
      vendor: Vendor.VendorYubico,
      metadata: {
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
      },
    };
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(original);

    handleDiscoveryChanged(event({ devices: [original] }, null, "monitor"));
    const outcome = get(statusBar).lastOutcome;
    handleDiscoveryChanged(event(
      { devices: [enriched] },
      null,
      DiscoveryTrigger.DiscoveryTriggerEnriched,
    ));

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
      vendor: Vendor.VendorYubico,
      metadata: {
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
      },
    };
    let finishSelection!: (value: { selection: ActiveSelection }) => void;
    serviceMocks.SetSelection.mockReturnValue(new Promise((resolve) => {
      finishSelection = resolve;
    }));
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedActiveScreenForTest("settings");

    const opening = handleDiscoveryChanged(event({ devices: [original] }));
    await vi.waitFor(() => {
      expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    });

    await handleDiscoveryChanged(event(
      { devices: [enriched] },
      null,
      DiscoveryTrigger.DiscoveryTriggerEnriched,
    ));
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
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedDevicesForTest([selected, unselected]);
    seedSelectionForTest(selected.fingerprint, selected, {
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
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
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
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-2" });
  });

  it("clears running and interaction state when the selected authenticator disappears", async () => {
    const token = device("token-1");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1" } as CredentialsEnvelope;
    const largeBlobs = { operationId: "large-blobs-1" } as LargeBlobListEnvelope;
    const { handleDiscoveryChanged, handleOperationProgress } = await import("./test-support/controller.js");
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
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      title: "Selected authenticator disconnected",
    });
  });

  it("keeps the last snapshot and authenticator on discovery failure", async () => {
    const token = device("token-1");
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(token);

    handleDiscoveryChanged(event(null, failureForCode(Code.CodeTransportFailure)));

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
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(token);
    seedOverviewEnvelopeForTest(inspection);

    handleDiscoveryChanged(event({ devices: [token] }, null, "monitor"));

    expect(get(authenticatorStatus).selectionId).toBe("authenticator-token-1");
    expect(get(authenticatorInspection).data).toBe(inspection);
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "info" });
  });

  it("requests manual reconciliation and waits for its event", async () => {
    const original = device("token-1");
    const { refreshDiscovery } = await import("./discovery-controller.js");
    seedDevicesForTest([original]);
    serviceMocks.RefreshDiscovery.mockResolvedValue(undefined);

    await refreshDiscovery();

    expect(serviceMocks.RefreshDiscovery).toHaveBeenCalledWith({});
    expect(get(devices)).toEqual([original]);
    expect(get(statusBar).lastOutcome).toBeNull();
  });

  it("starts monitoring through the service", async () => {
    const { startDiscoveryMonitoring } = await import("./discovery-controller.js");
    serviceMocks.StartDiscoveryMonitoring.mockResolvedValue(undefined);

    await expect(startDiscoveryMonitoring()).resolves.toBeUndefined();

    expect(serviceMocks.StartDiscoveryMonitoring).toHaveBeenCalledTimes(1);
  });
});
