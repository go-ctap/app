import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCategory, OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { CredentialsEnvelope, InteractionPrompt, MDSLookupEnvelope, OperationEventEnvelope, SessionSnapshot } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";

import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedOverviewBioSensorEnvelopeForTest,
  seedOverviewEnvelopeForTest,
  seedOverviewMDSForTest,
  seedPasskeysEnvelopeForTest,
  seedPendingInteractionForTest,
  seedSelectionForTest,
} from "./store-test-utils";
import {
  activeScreen,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewMDS,
  passkeysInventory,
  passkeysEnvelope,
  pendingInteraction,
  selectedSelector,
  sessionStatus,
  statusBar,
  workbenchLog,
} from "./stores";

const serviceMocks = vi.hoisted(() => ({
  BioSensorInfo: vi.fn(),
  CloseAllSessions: vi.fn(),
  Discover: vi.fn(),
  Inspect: vi.fn(),
  ListCredentials: vi.fn(),
  LookupMDS: vi.fn(),
  OpenSession: vi.fn(),
  ResolveInteraction: vi.fn(),
  Sessions: vi.fn(),
}));

vi.mock("../../bindings/fidobench/ctapkitservice", () => serviceMocks);

function device(id: string): DeviceReport {
  return {
    deviceId: id,
    ordinalAlias: id,
    stableId: true,
    transport: Mode.ModeHID,
    path: id,
    vendorId: 1,
    productId: 2,
    product: id,
  };
}

function snapshot(item: DeviceReport, sessionId = `session-${item.deviceId}`): SessionSnapshot {
  return {
    id: sessionId,
    info: {
      device: item,
      closed: false,
    },
    running: false,
    openedAt: "2026-06-22T00:00:00Z",
    updatedAt: "2026-06-22T00:00:00Z",
  } as SessionSnapshot;
}

function inspectEnvelope(item: DeviceReport) {
  return {
    operationId: `inspect-${item.deviceId}`,
    sessionId: `session-${item.deviceId}`,
    kind: OperationKind.OperationInspect,
    result: {
      result: {
        device: item,
        info: {
          versions: [],
          aaguid: "",
          options: {},
          conformanceFindings: [],
        },
      },
    },
  };
}

function credentialsEnvelope(item: DeviceReport, sessionId = `session-${item.deviceId}`, credentialIDHex = "cafe"): CredentialsEnvelope {
  return {
    operationId: `credentials-${item.deviceId}`,
    sessionId,
    kind: OperationKind.OperationListCredentials,
    result: {
      report: {
        device: item,
        support: {
          credentialManagement: true,
          previewOnly: false,
          readOnlyPermission: false,
        },
        summary: {
          existingResidentCredentialsCount: 1,
          maxPossibleRemainingResidentCredentialsCount: 8,
          totalRPs: 1,
          totalCredentials: 1,
        },
        groups: [{
          rpID: "example.com",
          rpName: "Example",
          rpIDHashHex: "abcd",
          credentials: [{
            credentialIDHex,
            credentialType: "public-key",
            userIDHex: "01",
            userName: "user@example.com",
            displayName: "Example User",
          }],
        }],
      },
    },
  } as CredentialsEnvelope;
}

describe("controller lifecycle", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
    serviceMocks.BioSensorInfo.mockResolvedValue(null);
    serviceMocks.CloseAllSessions.mockResolvedValue([]);
    serviceMocks.ListCredentials.mockResolvedValue(null);
    serviceMocks.LookupMDS.mockResolvedValue({ result: {} } as MDSLookupEnvelope);
    serviceMocks.ResolveInteraction.mockResolvedValue(true);
    serviceMocks.Sessions.mockResolvedValue([]);
  });

  it("auto-selects one discovered authenticator and loads overview once", async () => {
    const token = device("token-1");
    const { bootstrap } = await import("./controller");
    serviceMocks.Discover.mockResolvedValue({ devices: [token] });
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token));
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await bootstrap();

    expect(get(selectedSelector)).toBe("token-1");
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ sessionId: "session-token-1" });
  });

  it("does not auto-select when discovery returns multiple authenticators", async () => {
    const { bootstrap } = await import("./controller");
    serviceMocks.Discover.mockResolvedValue({ devices: [device("token-1"), device("token-2")] });

    await bootstrap();

    expect(get(selectedSelector)).toBe("");
    expect(serviceMocks.OpenSession).not.toHaveBeenCalled();
    expect(serviceMocks.Inspect).not.toHaveBeenCalled();
  });

  it("loads overview once when navigating back to overview with an existing selected session", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await navigateToScreen("overview");
    await navigateToScreen("overview");

    expect(get(activeScreen)).toBe("overview");
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
  });

  it("loads passkeys once when navigating to passkeys with an existing selected session", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));

    await navigateToScreen("passkeys");
    await navigateToScreen("passkeys");

    expect(get(activeScreen)).toBe("passkeys");
    expect(serviceMocks.ListCredentials).toHaveBeenCalledTimes(1);
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({ sessionId: "session-token-1" });
  });

  it("keeps passkeys transport failures as load errors without synthetic credentials envelopes", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockRejectedValue(new Error("bridge offline"));

    await loadPasskeys();

    const inventory = get(passkeysInventory);
    expect(inventory.state).toBe("error");
    expect(inventory.data).toBeNull();
    expect(inventory.error?.message).toBe("bridge offline");
    expect(get(passkeysEnvelope)).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("bridge offline");
    expect(get(workbenchLog)[0]).toMatchObject({
      tone: "error",
      source: "operation",
      message: "bridge offline",
    });
    expect(get(workbenchLog)[0]).not.toHaveProperty("operationId");
  });

  it("turns invalid session responses into a session error without retaining the expired session id", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);
    serviceMocks.ListCredentials.mockResolvedValue({
      operationId: "credentials-token-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationListCredentials,
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    } as CredentialsEnvelope);

    await loadPasskeys();

    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      selectedSelector: "token-1",
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    });
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(pendingInteraction)).toBeNull();
  });

  it("clearing selection clears per-device state and pending interaction", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedOverviewEnvelopeForTest(inspectEnvelope(token));
    seedOverviewBioSensorEnvelopeForTest(inspectEnvelope(token));
    seedOverviewMDSForTest(null);
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);

    await selectToken("");

    expect(get(selectedSelector)).toBe("");
    expect(get(overviewEnvelope)).toBeNull();
    expect(get(overviewBioSensorEnvelope)).toBeNull();
    expect(get(overviewMDS).data).toBeNull();
    expect(get(passkeysEnvelope)).toBeNull();
    expect(get(pendingInteraction)).toBeNull();
    expect(serviceMocks.ResolveInteraction).not.toHaveBeenCalled();
  });

  it("keeps overview transport failures as load errors without synthetic inspect envelopes", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    serviceMocks.Inspect.mockRejectedValue(new Error("inspect bridge offline"));

    await loadOverview();

    expect(get(overviewEnvelope)).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("inspect bridge offline");
    expect(get(workbenchLog)[0]).toMatchObject({
      tone: "error",
      source: "operation",
      message: "inspect bridge offline",
    });
    expect(get(workbenchLog)[0]).not.toHaveProperty("operationId");
  });

  it("records operation events from the runtime", async () => {
    const token = device("token-1");
    const { handleOperationProgress } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });

    handleOperationProgress({
      operationId: "operation-current",
      sessionId: "session-token-1",
      event: { stage: "enumerating-rps", message: "current" },
    } as OperationEventEnvelope);

    expect(get(workbenchLog)).toHaveLength(1);
    expect(get(statusBar).activeOperation?.operationId).toBe("operation-current");
  });

  it("exposes interaction prompts from the runtime", async () => {
    const token = device("token-1");
    const { handleInteractionRequested } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });

    handleInteractionRequested({
      interactionId: "interaction-current",
      operationId: "operation-current",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);

    expect(get(pendingInteraction)?.interactionId).toBe("interaction-current");
    expect(get(workbenchLog)).toHaveLength(1);
    expect(serviceMocks.ResolveInteraction).not.toHaveBeenCalled();
  });
});
