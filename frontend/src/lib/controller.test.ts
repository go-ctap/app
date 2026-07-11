import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCategory, OperationKind, VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { CredentialsEnvelope, InteractionPrompt, MDSLookupEnvelope, OperationEventEnvelope, SessionSnapshot } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { failPasskeysInventoryLoadAtRuntime } from "$lib/features/passkeys/state";

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
  passkeysInventoryState,
  passkeysMutation,
  passkeysQuery,
  passkeysSelectedCredentialID,
  passkeysStatusFilter,
  passkeysVerificationFlow,
  pendingInteraction,
  selectedSelector,
  sessionStatus,
  statusBar,
  workbenchLog,
} from "./stores";

const serviceMocks = vi.hoisted(() => ({
  BioSensorInfo: vi.fn(),
  CloseAllSessions: vi.fn(),
  DeleteCredential: vi.fn(),
  Discover: vi.fn(),
  Inspect: vi.fn(),
  ListCredentials: vi.fn(),
  LookupMDS: vi.fn(),
  OpenSession: vi.fn(),
  ResolveInteraction: vi.fn(),
  Sessions: vi.fn(),
  UpdateCredentialUser: vi.fn(),
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
          conformance: new Report(),
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
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: "",
      refresh: false,
    });
  });

  it("returns success and passes forced refresh plus PIN verification through Reload", async () => {
    const token = device("token-1");
    const { reloadPasskeys, setPasskeysVerificationFlow } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);

    await expect(reloadPasskeys()).resolves.toBe(true);

    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      refresh: true,
    });
  });

  it("reopens an errored selected session and preserves stale inventory until forced refresh succeeds", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./controller");
    const previous = credentialsEnvelope(token, "session-expired", "cafe");
    const refreshed = credentialsEnvelope(token, "session-reopened", "bead");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      selectedSelector: "token-1",
      selectedDevice: token,
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime({
      category: ErrorCategory.ErrorInvalidSession,
      message: "session expired",
    });
    serviceMocks.Sessions.mockResolvedValue([]);
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token, "session-reopened"));

    let resolveRefresh!: (envelope: CredentialsEnvelope) => void;
    const pendingRefresh = new Promise<CredentialsEnvelope>((resolve) => {
      resolveRefresh = resolve;
    });
    serviceMocks.ListCredentials.mockReturnValueOnce(pendingRefresh);

    const recovery = reloadPasskeys();
    await vi.waitFor(() => expect(serviceMocks.ListCredentials).toHaveBeenCalledTimes(1));

    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-reopened",
      verificationFlow: "",
      refresh: true,
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "refreshing",
      lastSuccessfulEnvelope: previous,
      stale: true,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);

    resolveRefresh(refreshed);
    await expect(recovery).resolves.toBe(true);
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "session-reopened" });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "ready",
      lastSuccessfulEnvelope: refreshed,
      responseEnvelope: refreshed,
      runtimeError: null,
      stale: false,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(refreshed);
  });

  it("preserves last-known-good inventory when reopening the selected session fails", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./controller");
    const previous = credentialsEnvelope(token, "session-expired", "cafe");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      selectedSelector: "token-1",
      selectedDevice: token,
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime({
      category: ErrorCategory.ErrorInvalidSession,
      message: "session expired",
    });
    serviceMocks.Sessions.mockResolvedValue([]);
    serviceMocks.OpenSession.mockRejectedValueOnce(new Error("session bridge offline"));

    await expect(reloadPasskeys()).resolves.toBe(false);

    expect(get(selectedSelector)).toBe("token-1");
    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      error: { message: "session bridge offline" },
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: previous,
      responseEnvelope: null,
      stale: true,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
  });

  it("keeps recovered inventory stale when its forced refresh returns an error envelope", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./controller");
    const previous = credentialsEnvelope(token, "session-expired", "cafe");
    const refreshError = {
      operationId: "refresh-1",
      sessionId: "session-reopened",
      kind: OperationKind.OperationListCredentials,
      error: { category: ErrorCategory.ErrorTransportFailure, message: "refresh failed" },
    } as CredentialsEnvelope;
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      selectedSelector: "token-1",
      selectedDevice: token,
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime({
      category: ErrorCategory.ErrorInvalidSession,
      message: "session expired",
    });
    serviceMocks.Sessions.mockResolvedValue([]);
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token, "session-reopened"));
    serviceMocks.ListCredentials.mockResolvedValue(refreshError);

    await expect(reloadPasskeys()).resolves.toBe(false);

    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-reopened",
      verificationFlow: "",
      refresh: true,
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: previous,
      responseEnvelope: refreshError,
      runtimeError: null,
      stale: true,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "session-reopened" });
  });

  it("reconciles credential selection after a successful refresh", async () => {
    const token = device("token-1");
    const { loadPasskeys, selectPasskeyCredential } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token, "session-token-1", "cafe"));
    selectPasskeyCredential("cafe");
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token, "session-token-1", "bead"));

    await loadPasskeys({ refresh: true });

    expect(get(passkeysSelectedCredentialID)).toBe("");
  });

  it("passes PIN verification into credential delete dry-runs", async () => {
    const token = device("token-1");
    const { beginCredentialDelete, setPasskeysVerificationFlow } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    serviceMocks.DeleteCredential.mockResolvedValue({
      operationId: "delete-preview-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationDeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.com" },
        result: null,
      },
    });

    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(serviceMocks.DeleteCredential).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      dryRun: true,
    });
    expect(get(passkeysMutation)).toMatchObject({ kind: "delete", phase: "review" });
  });

  it("executes the exact reviewed update request and forces a refresh", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "", displayName: "Example User" },
      warnings: [],
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "update-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: {
          preview,
          result: {
            deviceId: "token-1",
            credentialIDHex: "cafe",
            rpID: "example.com",
            previous: preview.current,
            current: preview.proposed,
          },
        },
      });
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);
    const previewRequest = {
      sessionId: "session-token-1",
      verificationFlow: "",
      credentialIdHex: "cafe",
      name: "",
      nameProvided: true,
      dryRun: true,
    };
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenNthCalledWith(1, previewRequest);

    expect(await confirmCredentialUpdate()).toBe(true);
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenNthCalledWith(2, {
      ...previewRequest,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Confirm update",
    });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: "",
      refresh: true,
    });
    expect(get(passkeysSelectedCredentialID)).toBe("cafe");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
  });

  it("reports mutation success before its forced refresh completes", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      warnings: [],
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "update-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: {
          preview,
          result: {
            deviceId: "token-1",
            credentialIDHex: "cafe",
            rpID: "example.com",
            previous: preview.current,
            current: preview.proposed,
          },
        },
      });

    let resolveRefresh!: (envelope: CredentialsEnvelope) => void;
    const refresh = new Promise<CredentialsEnvelope>((resolve) => {
      resolveRefresh = resolve;
    });
    const order: string[] = [];
    serviceMocks.ListCredentials.mockImplementationOnce(() => {
      order.push("refresh");
      return refresh;
    });
    const onSucceeded = vi.fn(() => order.push("success"));

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);

    const confirmation = confirmCredentialUpdate(onSucceeded);
    await vi.waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));

    expect(order).toEqual(["success", "refresh"]);
    let completed = false;
    void confirmation.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);

    resolveRefresh(credentialsEnvelope(token));
    await expect(confirmation).resolves.toBe(true);
    expect(completed).toBe(true);
  });

  it("executes the exact reviewed delete request and keeps stale rows when its forced refresh fails", async () => {
    const token = device("token-1");
    const { beginCredentialDelete, confirmCredentialDelete } = await import("./controller");
    const inventory = credentialsEnvelope(token);
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(inventory);
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      rpName: "Example",
      userIDHex: "01",
      userName: "user@example.com",
      displayName: "Example User",
      warnings: [],
    };
    serviceMocks.DeleteCredential
      .mockResolvedValueOnce({
        operationId: "delete-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationDeleteCredential,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "delete-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationDeleteCredential,
        result: {
          preview,
          result: {
            deviceId: "token-1",
            credentialIDHex: "cafe",
            rpID: "example.com",
            rpName: "Example",
            userIDHex: "01",
            userName: "user@example.com",
            displayName: "Example User",
          },
        },
      });
    serviceMocks.ListCredentials.mockRejectedValue(new Error("refresh bridge offline"));

    expect(await beginCredentialDelete("cafe")).toBe(true);
    const previewRequest = {
      sessionId: "session-token-1",
      verificationFlow: "",
      credentialIdHex: "cafe",
      dryRun: true,
    };
    expect(serviceMocks.DeleteCredential).toHaveBeenNthCalledWith(1, previewRequest);

    expect(await confirmCredentialDelete()).toBe(true);
    expect(serviceMocks.DeleteCredential).toHaveBeenNthCalledWith(2, {
      ...previewRequest,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Confirm delete",
    });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: "",
      refresh: true,
    });
    expect(get(passkeysSelectedCredentialID)).toBe("");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: inventory,
      responseEnvelope: null,
      runtimeError: { message: "refresh bridge offline" },
      stale: true,
    });
  });

  it("keeps the real mutation error envelope and does not fabricate a runtime failure", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      retryLastStatusOutcome,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      warnings: [],
    };
    const errorEnvelope = {
      operationId: "update-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationUpdateCredentialUser,
      error: { category: ErrorCategory.ErrorTransportFailure, message: "device disconnected" },
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce(errorEnvelope)
      .mockResolvedValueOnce({
        operationId: "update-2",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: {
          preview,
          result: {
            deviceId: "token-1",
            credentialIDHex: "cafe",
            rpID: "example.com",
            previous: preview.current,
            current: preview.proposed,
          },
        },
      });
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);

    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "executing",
      failureReason: "response-error",
      responseEnvelope: errorEnvelope,
      runtimeError: null,
    });
    expect(get(statusBar).lastOutcome?.retry).toBeTypeOf("function");

    expect(await retryLastStatusOutcome()).toBe(true);
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenCalledTimes(3);
    expect(serviceMocks.UpdateCredentialUser.mock.calls[2][0]).toEqual(serviceMocks.UpdateCredentialUser.mock.calls[1][0]);
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
  });

  it("clears an invalid mutation session and refuses to retry its reviewed request", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      retryPasskeysMutation,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      warnings: [],
    };
    const invalidSessionEnvelope = {
      operationId: "update-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationUpdateCredentialUser,
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce(invalidSessionEnvelope);

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);

    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      error: { category: ErrorCategory.ErrorInvalidSession, message: "session expired" },
    });
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: invalidSessionEnvelope,
    });

    expect(await retryPasskeysMutation()).toBe(false);
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenCalledTimes(2);
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
  });

  it("stores a null response and a separate runtime error when mutation preview throws", async () => {
    const token = device("token-1");
    const { beginCredentialUpdate, previewCredentialUpdate, updateCredentialDraft } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    serviceMocks.UpdateCredentialUser.mockRejectedValue(new Error("mutation bridge offline"));

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ displayName: "Updated User" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(false);

    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "previewing",
      failureReason: "runtime-error",
      responseEnvelope: null,
      runtimeError: { message: "mutation bridge offline" },
    });
  });

  it("reports a successful mutation envelope with no execution result as a typed missing-result error", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      warnings: [],
    };
    const noResultEnvelope = {
      operationId: "update-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationUpdateCredentialUser,
      result: { preview, result: null },
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce(noResultEnvelope);

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);

    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "executing",
      failureReason: "missing-result",
      responseEnvelope: noResultEnvelope,
      runtimeError: null,
    });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The operation completed without an execution result.",
    });
    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();
  });

  it("keeps passkeys transport failures as load errors without synthetic credentials envelopes", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockRejectedValue(new Error("bridge offline"));

    await loadPasskeys();

    const inventory = get(passkeysInventoryState);
    expect(inventory.phase).toBe("error");
    expect(inventory.lastSuccessfulEnvelope).toBeNull();
    expect(inventory.responseEnvelope).toBeNull();
    expect(inventory.runtimeError?.message).toBe("bridge offline");
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("bridge offline");
    expect(get(workbenchLog)[0]).toMatchObject({
      tone: "error",
      source: "operation",
      message: "bridge offline",
    });
    expect(get(workbenchLog)[0]).not.toHaveProperty("operationId");
  });

  it("keeps an exact result-less credential-list envelope and reports the contract failure separately", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    const envelope = {
      operationId: "credentials-token-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationListCredentials,
    } as CredentialsEnvelope;
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockResolvedValue(envelope);

    await loadPasskeys();

    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: null,
      responseEnvelope: envelope,
      runtimeError: null,
      stale: false,
    });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The operation completed without an execution result.",
    });
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
    const {
      beginCredentialUpdate,
      selectPasskeyCredential,
      selectToken,
      setPasskeysQuery,
      setPasskeysStatusFilter,
      setPasskeysVerificationFlow,
    } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    seedOverviewEnvelopeForTest(inspectEnvelope(token));
    seedOverviewBioSensorEnvelopeForTest(inspectEnvelope(token));
    seedOverviewMDSForTest(null);
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    selectPasskeyCredential("cafe");
    setPasskeysQuery("example");
    setPasskeysStatusFilter("large-blob-missing");
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    expect(beginCredentialUpdate("cafe")).toBe(true);
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
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(passkeysQuery)).toBe("");
    expect(get(passkeysStatusFilter)).toBe("all");
    expect(get(passkeysSelectedCredentialID)).toBe("");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(passkeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(get(pendingInteraction)).toBeNull();
    expect(serviceMocks.ResolveInteraction).not.toHaveBeenCalled();
  });

  it("switching authenticators closes an open mutation flow and keeps only the UV preference", async () => {
    const first = device("token-1");
    const second = device("token-2");
    const {
      beginCredentialUpdate,
      selectPasskeyCredential,
      selectToken,
      setPasskeysQuery,
      setPasskeysVerificationFlow,
    } = await import("./controller");
    seedDevicesForTest([first, second]);
    seedActiveScreenForTest("settings");
    seedSelectionForTest("token-1", first, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: first,
      sessionId: "session-token-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(first));
    selectPasskeyCredential("cafe");
    setPasskeysQuery("example");
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    expect(beginCredentialUpdate("cafe")).toBe(true);
    serviceMocks.Sessions.mockResolvedValue([snapshot(first)]);
    serviceMocks.OpenSession.mockResolvedValue(snapshot(second));

    await selectToken("token-2");

    expect(get(selectedSelector)).toBe("token-2");
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(passkeysQuery)).toBe("");
    expect(get(passkeysSelectedCredentialID)).toBe("");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(passkeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(serviceMocks.CloseAllSessions).toHaveBeenCalledOnce();
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-2" });
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
