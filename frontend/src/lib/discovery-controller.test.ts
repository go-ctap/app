import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  CredentialsEnvelope,
  DiscoveryChangedEnvelope,
  InspectEnvelope,
  InteractionPrompt,
  LargeBlobListEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";
import { DiscoveryTrigger } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";
import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";

import { setAppLocale } from "$lib/i18n";

import {
  resetAppStateForTest,
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
  overviewInspection,
  passkeysInventoryState,
  pendingInteraction,
  selectedDevice,
  selectedSelector,
  sessionStatus,
  statusBar,
} from "./stores.js";

const serviceMocks = vi.hoisted(() => ({
  RefreshDiscovery: vi.fn(),
  StartDiscoveryMonitoring: vi.fn(),
}));

vi.mock("../../bindings/fidobench/ctapkitservice", () => serviceMocks);

function device(id: string, product = id): DeviceReport {
  return {
    deviceId: id,
    ordinalAlias: id,
    stableId: true,
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
  seedSelectionForTest(token.deviceId, token, {
    state,
    sessionId: `session-${token.deviceId}`,
  });
}

describe("discovery controller", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
  });

  it("adds a late authenticator without selecting or opening it", async () => {
    const token = device("token-1");
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");

    handleDiscoveryChanged(event({ devices: [token] }));

    expect(get(devices)).toEqual([token]);
    expect(get(selectedSelector)).toBe("");
    expect(get(selectedDevice)).toBeNull();
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Authenticator list updated",
    });
  });

  it("preserves the selected session and screen state when its device remains", async () => {
    const original = device("token-1", "Original");
    const refreshed = device("token-1", "Refreshed");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1" } as CredentialsEnvelope;
    const largeBlobs = { operationId: "large-blobs-1" } as LargeBlobListEnvelope;
    const prompt = {
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
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
    expect(get(sessionStatus)).toMatchObject({
      state: "ready",
      sessionId: "session-token-1",
    });
    expect(get(overviewInspection).data).toBe(inspection);
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
    expect(get(sessionStatus)).toMatchObject({
      state: "ready",
      sessionId: "session-token-1",
    });
    expect(get(statusBar).lastOutcome).toBe(outcome);
  });

  it("removes an unselected authenticator without disturbing the selected session", async () => {
    const selected = device("token-1");
    const unselected = device("token-2");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedDevicesForTest([selected, unselected]);
    seedSelectionForTest(selected.deviceId, selected, {
      state: "ready",
      sessionId: "session-token-1",
    });
    seedOverviewEnvelopeForTest(inspection);

    handleDiscoveryChanged(event({ devices: [selected] }));

    expect(get(devices)).toEqual([selected]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(sessionStatus).sessionId).toBe("session-token-1");
    expect(get(overviewInspection).data).toBe(inspection);
  });

  it("clears an idle selected session when its authenticator disappears", async () => {
    const selected = device("token-1");
    const remaining = device("token-2");
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(selected);

    handleDiscoveryChanged(event({ devices: [remaining] }));

    expect(get(devices)).toEqual([remaining]);
    expect(get(selectedSelector)).toBe("");
    expect(get(sessionStatus)).toMatchObject({ state: "idle" });
    expect(get(sessionStatus).sessionId).toBeUndefined();
  });

  it("clears running and interaction state when the selected authenticator disappears", async () => {
    const token = device("token-1");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const inventory = { operationId: "credentials-1" } as CredentialsEnvelope;
    const largeBlobs = { operationId: "large-blobs-1" } as LargeBlobListEnvelope;
    const { handleDiscoveryChanged, handleOperationProgress } = await import("./controller.js");
    seedSelected(token, "running");
    seedOverviewEnvelopeForTest(inspection);
    seedPasskeysEnvelopeForTest(inventory);
    seedLargeBlobsEnvelopeForTest(largeBlobs);
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);
    handleOperationProgress({
      operationId: "operation-1",
      sessionId: "session-token-1",
      event: { stage: OperationStage.OperationStageInteractionRequired, message: "Touch the key" },
    });

    handleDiscoveryChanged(event({ devices: [] }));

    expect(get(devices)).toEqual([]);
    expect(get(selectedSelector)).toBe("");
    expect(get(selectedDevice)).toBeNull();
    expect(get(sessionStatus)).toMatchObject({ state: "idle" });
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(pendingInteraction)).toBeNull();
    expect(get(overviewInspection).data).toBeNull();
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      title: "Selected authenticator disconnected",
    });
  });

  it("keeps the last snapshot and session on discovery failure", async () => {
    const token = device("token-1");
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(token);

    handleDiscoveryChanged(event(null, { message: "rescan failed" }));

    expect(get(devices)).toEqual([token]);
    expect(get(selectedSelector)).toBe("token-1");
    expect(get(sessionStatus).sessionId).toBe("session-token-1");
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "rescan failed",
    });
  });

  it("keeps an identical snapshot and current session without clearing caches", async () => {
    const token = device("token-1");
    const inspection = { operationId: "inspect-1" } as InspectEnvelope;
    const { handleDiscoveryChanged } = await import("./discovery-controller.js");
    seedSelected(token);
    seedOverviewEnvelopeForTest(inspection);

    handleDiscoveryChanged(event({ devices: [token] }, null, "monitor"));

    expect(get(sessionStatus).sessionId).toBe("session-token-1");
    expect(get(overviewInspection).data).toBe(inspection);
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
