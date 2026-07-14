import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LargeBlobMutationOutput,
  OperationKind,
  VerificationFlow,
} from "../../bindings/github.com/go-ctap/kit/model";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  MutationOperation,
  MutationPreview,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import {
  InteractionAnswer,
  LargeBlobMutationEnvelope,
  type BioSensorEnvelope,
  type CredentialsEnvelope,
  type InteractionPrompt,
  type LargeBlobListEnvelope,
  type MDSLookupEnvelope,
  type OperationEventEnvelope,
  type SessionSnapshot,
} from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { failPasskeysInventoryLoadAtRuntime } from "$lib/features/passkeys/state";
import { failureForCode } from "$lib/test-failure";

import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedLargeBlobsEnvelopeForTest,
  seedOverviewBioSensorEnvelopeForTest,
  seedOverviewEnvelopeForTest,
  seedOverviewMDSForTest,
  seedPasskeysEnvelopeForTest,
  seedPendingInteractionForTest,
  seedSelectionForTest,
} from "./store-test-utils";
import {
  activeScreen,
  largeBlobsInventoryState,
  largeBlobsMutation,
  largeBlobsPayloadEncoding,
  largeBlobsQuery,
  largeBlobsSelectedCredentialID,
  largeBlobsStatusFilter,
  largeBlobsVerificationFlow,
  overviewBioSensor,
  overviewInspection,
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
} from "./stores";

const serviceMocks = vi.hoisted(() => ({
  BioSensorInfo: vi.fn(),
  CloseAllSessions: vi.fn(),
  DeleteCredential: vi.fn(),
  DeleteLargeBlob: vi.fn(),
  Discover: vi.fn(),
  Inspect: vi.fn(),
  ListCredentials: vi.fn(),
  ListLargeBlobs: vi.fn(),
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
    vendor: Vendor.VendorUnknown,
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

function bioSensorEnvelope(item: DeviceReport): BioSensorEnvelope {
  return {
    operationId: `bio-${item.deviceId}`,
    sessionId: `session-${item.deviceId}`,
    kind: OperationKind.OperationBioSensorInfo,
    result: {
      report: {
        device: item,
        supported: false,
        previewOnly: false,
      },
    },
  } as BioSensorEnvelope;
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

function largeBlobListEnvelope(item: DeviceReport, sessionId = `session-${item.deviceId}`): LargeBlobListEnvelope {
  return {
    operationId: `large-blobs-${item.deviceId}`,
    sessionId,
    kind: OperationKind.OperationListLargeBlobs,
    result: {
      report: {
        device: item,
        support: {
          largeBlobs: true,
          largeBlobKeyExtension: true,
        },
        array: {
          read: true,
          blobCount: 0,
          matchedBlobCount: 0,
          unmatchedBlobCount: 0,
        },
        credentials: [{
          credentialIDHex: "cafe",
          rp: { id: "example.com", name: "Example" },
          user: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
          largeBlobKeyState: "available",
          blobPresent: false,
          blobState: "missing",
          blobByteCount: 0,
        }],
      },
    },
  } as LargeBlobListEnvelope;
}

describe("controller lifecycle", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
    serviceMocks.BioSensorInfo.mockResolvedValue(null);
    serviceMocks.CloseAllSessions.mockResolvedValue([]);
    serviceMocks.ListCredentials.mockResolvedValue(null);
    serviceMocks.ListLargeBlobs.mockResolvedValue(null);
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
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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

  it("loads large blobs once when navigating to the screen with an existing selected session", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.ListLargeBlobs.mockResolvedValue(largeBlobListEnvelope(token));

    await navigateToScreen("large-blobs");
    await navigateToScreen("large-blobs");

    expect(get(activeScreen)).toBe("large-blobs");
    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledTimes(1);
    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: "",
      refresh: false,
    });
  });

  it("passes forced refresh and PIN verification through large blobs Reload", async () => {
    const token = device("token-1");
    const { reloadLargeBlobs, setLargeBlobsVerificationFlow } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.ListLargeBlobs.mockResolvedValue(largeBlobListEnvelope(token));
    setLargeBlobsVerificationFlow(VerificationFlow.VerificationFlowPIN);

    await expect(reloadLargeBlobs()).resolves.toBe(true);

    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledWith({
      sessionId: "session-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      refresh: true,
    });
  });

  it("returns success and passes forced refresh plus PIN verification through Reload", async () => {
    const token = device("token-1");
    const { reloadPasskeys, setPasskeysVerificationFlow } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      error: failureForCode(Code.CodeSessionInvalid),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeSessionInvalid));
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
      error: failureForCode(Code.CodeSessionInvalid),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeSessionInvalid));
    serviceMocks.Sessions.mockResolvedValue([]);
    serviceMocks.OpenSession.mockRejectedValueOnce(new Error("session bridge offline"));

    await expect(reloadPasskeys()).resolves.toBe(false);

    expect(get(selectedSelector)).toBe("token-1");
    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeInternalError),
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: previous,
      responseEnvelope: null,
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
      error: failureForCode(Code.CodeTransportFailure),
    } as CredentialsEnvelope;
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeSessionInvalid));
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
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "session-reopened" });
  });

  it("reconciles credential selection after a successful refresh", async () => {
    const token = device("token-1");
    const { loadPasskeys, selectPasskeyCredential } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token, "session-token-1", "cafe"));
    selectPasskeyCredential("cafe");
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token, "session-token-1", "bead"));

    await loadPasskeys({ refresh: true });

    expect(get(passkeysSelectedCredentialID)).toBe("");
  });

  it("passes PIN verification into credential delete dry-runs", async () => {
    const token = device("token-1");
    const { beginCredentialDelete, setPasskeysVerificationFlow } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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

  it("reopens an invalid selected session before repeating a credential delete preview", async () => {
    const token = device("token-1");
    const { beginCredentialDelete } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token, "session-expired"));
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token, "session-reopened"));
    serviceMocks.DeleteCredential.mockResolvedValue({
      operationId: "delete-preview-1",
      sessionId: "session-reopened",
      kind: OperationKind.OperationDeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.com" },
        result: null,
      },
    });

    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.DeleteCredential).toHaveBeenCalledWith({
      sessionId: "session-reopened",
      verificationFlow: "",
      credentialIdHex: "cafe",
      dryRun: true,
    });
  });

  it("reopens an invalid selected session before repeating a large-blob delete preview", async () => {
    const token = device("token-1");
    const { beginLargeBlobDelete } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    seedLargeBlobsEnvelopeForTest(largeBlobListEnvelope(token, "session-expired"));
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token, "session-reopened"));
    serviceMocks.DeleteLargeBlob.mockResolvedValue(new LargeBlobMutationEnvelope({
      operationId: "large-blob-delete-preview-1",
      sessionId: "session-reopened",
      kind: OperationKind.OperationDeleteLargeBlob,
      result: new LargeBlobMutationOutput({
        preview: new MutationPreview({
          operation: MutationOperation.MutationDelete,
        }),
        result: null,
      }),
    }));

    expect(await beginLargeBlobDelete("cafe")).toBe(true);
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.DeleteLargeBlob).toHaveBeenCalledWith({
      sessionId: "session-reopened",
      verificationFlow: "",
      credentialIdHex: "cafe",
      dryRun: true,
    });
  });

  it("executes the exact reviewed update request and forces a refresh", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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

  it("keeps mutation confirmation pending until its forced refresh completes", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
    serviceMocks.ListCredentials.mockImplementationOnce(() => {
      return refresh;
    });

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);

    const confirmation = confirmCredentialUpdate();
    await vi.waitFor(() => expect(serviceMocks.ListCredentials).toHaveBeenCalledTimes(1));
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
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      runtimeError: failureForCode(Code.CodeInternalError),
    });
  });

  it("keeps the real mutation error envelope and does not fabricate a runtime failure", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      error: failureForCode(Code.CodeTransportFailure),
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        sessionId: "session-token-1",
        kind: OperationKind.OperationUpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce(errorEnvelope);

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
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenCalledTimes(2);
  });

  it("clears an invalid mutation session without reissuing its reviewed request", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      error: failureForCode(Code.CodeSessionInvalid),
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
      error: failureForCode(Code.CodeSessionInvalid),
    });
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: invalidSessionEnvelope,
    });

    expect(serviceMocks.UpdateCredentialUser).toHaveBeenCalledTimes(2);
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
  });

  it("stores a null response and a separate runtime error when mutation preview throws", async () => {
    const token = device("token-1");
    const { beginCredentialUpdate, previewCredentialUpdate, updateCredentialDraft } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      runtimeError: failureForCode(Code.CodeInternalError),
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
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      message: "The operation returned an unexpected result type.",
    });
  });

  it("keeps passkeys transport failures as load errors without synthetic credentials envelopes", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockRejectedValue(new Error("bridge offline"));

    await loadPasskeys();

    const inventory = get(passkeysInventoryState);
    expect(inventory.phase).toBe("error");
    expect(inventory.lastSuccessfulEnvelope).toBeNull();
    expect(inventory.responseEnvelope).toBeNull();
    expect(inventory.runtimeError?.code).toBe(Code.CodeInternalError);
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("The operation failed because of an internal error.");
  });

  it("keeps an exact result-less credential-list envelope and reports the contract failure separately", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    const envelope = {
      operationId: "credentials-token-1",
      sessionId: "session-token-1",
      kind: OperationKind.OperationListCredentials,
    } as CredentialsEnvelope;
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.ListCredentials.mockResolvedValue(envelope);

    await loadPasskeys();

    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: null,
      responseEnvelope: envelope,
      runtimeError: null,
    });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The operation returned an unexpected result type.",
    });
  });

  it("turns invalid session responses into a session error without retaining the expired session id", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
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
      error: failureForCode(Code.CodeSessionInvalid),
    } as CredentialsEnvelope);

    await loadPasskeys();

    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    expect(get(sessionStatus).sessionId).toBeUndefined();
    expect(get(pendingInteraction)).toBeNull();
  });

  it("clearing selection clears per-device state and pending interaction", async () => {
    const token = device("token-1");
    const {
      beginLargeBlobWrite,
      beginCredentialUpdate,
      selectLargeBlobCredential,
      selectPasskeyCredential,
      selectToken,
      setLargeBlobsPayloadEncoding,
      setLargeBlobsQuery,
      setLargeBlobsStatusFilter,
      setLargeBlobsVerificationFlow,
      setPasskeysQuery,
      setPasskeysStatusFilter,
      setPasskeysVerificationFlow,
    } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    seedOverviewEnvelopeForTest(inspectEnvelope(token));
    seedOverviewBioSensorEnvelopeForTest(bioSensorEnvelope(token));
    seedOverviewMDSForTest(null);
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    seedLargeBlobsEnvelopeForTest(largeBlobListEnvelope(token));
    selectPasskeyCredential("cafe");
    setPasskeysQuery("example");
    setPasskeysStatusFilter("large-blob-missing");
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    expect(beginCredentialUpdate("cafe")).toBe(true);
    selectLargeBlobCredential("cafe");
    setLargeBlobsQuery("example");
    setLargeBlobsStatusFilter("present");
    setLargeBlobsVerificationFlow(VerificationFlow.VerificationFlowPIN);
    setLargeBlobsPayloadEncoding("hex");
    expect(beginLargeBlobWrite("cafe")).toBe(true);
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);

    await selectToken("");

    expect(get(selectedSelector)).toBe("");
    expect(get(overviewInspection).data).toBeNull();
    expect(get(overviewBioSensor).data).toBeNull();
    expect(get(overviewMDS).data).toBeNull();
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(passkeysQuery)).toBe("");
    expect(get(passkeysStatusFilter)).toBe("all");
    expect(get(passkeysSelectedCredentialID)).toBe("");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(passkeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(get(largeBlobsInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(largeBlobsQuery)).toBe("");
    expect(get(largeBlobsStatusFilter)).toBe("all");
    expect(get(largeBlobsSelectedCredentialID)).toBe("");
    expect(get(largeBlobsMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(largeBlobsVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(get(largeBlobsPayloadEncoding)).toBe("hex");
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

  it("keeps the current operation and screen state when its selected token is clicked again", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "running",
      sessionId: "session-token-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));

    await selectToken("token-1");

    expect(get(sessionStatus)).toMatchObject({
      state: "running",
      sessionId: "session-token-1",
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).not.toBeNull();
    expect(serviceMocks.Sessions).not.toHaveBeenCalled();
    expect(serviceMocks.CloseAllSessions).not.toHaveBeenCalled();
    expect(serviceMocks.OpenSession).not.toHaveBeenCalled();
  });

  it("reports the concrete session-open failure when device selection cannot open", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./controller");
    seedDevicesForTest([token]);
    serviceMocks.Sessions.mockRejectedValue(new Error("session open failed", {
      cause: failureForCode(Code.CodeDeviceBusy),
    }));

    await selectToken("token-1");

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The selected authenticator is already in use.",
    });
  });

  it("keeps overview transport failures as load errors without synthetic inspect envelopes", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.Inspect.mockRejectedValue(new Error("inspect bridge offline"));

    await loadOverview();

    expect(get(overviewInspection).data).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("The operation failed because of an internal error.");
  });

  it("reopens an invalid selected session before reloading overview", async () => {
    const token = device("token-1");
    const { reloadOverview } = await import("./controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    serviceMocks.Sessions.mockResolvedValue([]);
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token, "session-reopened"));
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await reloadOverview();

    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ sessionId: "session-reopened" });
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "session-reopened" });
  });

  it("keeps a failed Inspect response as its typed envelope and exact kit error", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./controller");
    const envelope = {
      operationId: "inspect-error",
      sessionId: "session-token-1",
      kind: OperationKind.OperationInspect,
      error: failureForCode(Code.CodeDeviceBusy),
    };
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.Inspect.mockResolvedValue(envelope);

    await loadOverview();

    expect(get(overviewInspection)).toMatchObject({
      state: "error",
      data: envelope,
      error: failureForCode(Code.CodeDeviceBusy),
    });
    expect(get(statusBar).lastOutcome?.message).toBe("The selected authenticator is already in use.");
  });

  it("keeps a biometric sub-load failure visible instead of overwriting it with inspect success", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./controller");
    const envelope = inspectEnvelope(token);
    envelope.result.result.info.options = { bioEnroll: true };
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });
    serviceMocks.Inspect.mockResolvedValue(envelope);
    serviceMocks.BioSensorInfo.mockRejectedValue(new Error("BioSensorInfo failed", {
      cause: {
        code: Code.CodeTransportFailure,
        category: "transport-failure",
      },
    }));

    await loadOverview();

    expect(get(overviewBioSensor).state).toBe("error");
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      message: "Communication with the authenticator failed.",
    });
  });

  it("records operation events from the runtime", async () => {
    const token = device("token-1");
    const { handleOperationProgress } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });

    handleOperationProgress({
      operationId: "operation-current",
      sessionId: "session-token-1",
      event: { stage: "enumerating-rps", message: "current" },
    } as OperationEventEnvelope);

    expect(get(statusBar).activeOperation?.operationId).toBe("operation-current");
  });

  it("exposes interaction prompts from the runtime", async () => {
    const token = device("token-1");
    const { handleInteractionRequested } = await import("./controller");
    seedSelectionForTest("token-1", token, { state: "ready", sessionId: "session-token-1" });

    handleInteractionRequested({
      interactionId: "interaction-current",
      operationId: "operation-current",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);

    expect(get(pendingInteraction)?.interactionId).toBe("interaction-current");
    expect(serviceMocks.ResolveInteraction).not.toHaveBeenCalled();
  });

  it("keeps the interaction pending until Wails resolves it and clears the typed PIN DTO", async () => {
    const { answerPendingInteraction } = await import("./controller");
    seedPendingInteractionForTest({ interactionId: "interaction-current" } as InteractionPrompt);
    let receivedPIN = "";
    let resolveInteraction!: (value: boolean) => void;
    serviceMocks.ResolveInteraction.mockImplementationOnce((received: InteractionAnswer) => {
      receivedPIN = received.pin ?? "";
      return new Promise<boolean>((resolve) => { resolveInteraction = resolve; });
    });
    const answer = new InteractionAnswer({
      interactionId: "interaction-current",
      pin: "123456",
      confirmed: true,
    });

    const pending = answerPendingInteraction(answer);

    expect(receivedPIN).toBe("123456");
    expect(answer.pin).toBe("");
    expect(get(pendingInteraction)).not.toBeNull();
    resolveInteraction(true);
    await expect(pending).resolves.toBe(true);
    expect(get(pendingInteraction)).toBeNull();
  });

  it("does not clear a retry prompt emitted while the previous answer resolves", async () => {
    const { answerPendingInteraction, handleInteractionRequested } = await import("./controller");
    seedPendingInteractionForTest({ interactionId: "interaction-1" } as InteractionPrompt);
    serviceMocks.ResolveInteraction.mockImplementationOnce(async () => {
      handleInteractionRequested({
        interactionId: "interaction-2",
        operationId: "operation-1",
        sessionId: "session-1",
        request: { kind: "pin" },
      } as InteractionPrompt);
      return true;
    });

    await answerPendingInteraction(new InteractionAnswer({
      interactionId: "interaction-1",
      pin: "1234",
      confirmed: true,
    }));

    expect(get(pendingInteraction)?.interactionId).toBe("interaction-2");
  });

  it("preserves a typed interaction failure code in the UI outcome", async () => {
    const { answerPendingInteraction } = await import("./controller");
    seedPendingInteractionForTest({ interactionId: "interaction-current" } as InteractionPrompt);
    serviceMocks.ResolveInteraction.mockRejectedValueOnce(new Error("ResolveInteraction failed", {
      cause: {
        code: Code.CodePINInvalid,
        category: "invalid-state",
        operation: "interaction.resolve",
      },
    }));

    await expect(answerPendingInteraction(new InteractionAnswer({
      interactionId: "interaction-current",
      pin: "123456",
      confirmed: true,
    }))).resolves.toBe(false);

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The PIN is incorrect.",
    });
    expect(get(pendingInteraction)).toBeNull();
  });
});
