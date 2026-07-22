import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	InteractionKind,
} from "../../bindings/github.com/go-ctap/kit/model";
import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Assessment } from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  MutationOutput as LargeBlobMutationOutput,
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
  type ActiveSelection,
} from "../../bindings/telesma/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n";
import { logController } from "$lib/features/logs/state.svelte.js";
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
  authenticatorInspection,
  overviewMDS,
  passkeysInventoryState,
  passkeysMutation,
  passkeysQuery,
  passkeysSelectedCredentialID,
  passkeysStatusFilter,
  passkeysVerificationFlow,
  pendingInteraction,
  selectedSelector,
  authenticatorStatus,
  statusBar,
} from "./test-support/stores";

const serviceMocks = vi.hoisted(() => ({
  BioSensorInfo: vi.fn(),
  DeleteCredential: vi.fn(),
  DeleteLargeBlob: vi.fn(),
  Discover: vi.fn(),
  Inspect: vi.fn(),
  ListCredentials: vi.fn(),
  ListLargeBlobs: vi.fn(),
  LookupMDS: vi.fn(),
  SetSelection: vi.fn(),
  ResolveInteraction: vi.fn(),
  UpdateCredentialUser: vi.fn(),
}));

vi.mock("../../bindings/telesma/ctapkitservice", () => serviceMocks);

function device(id: string): DeviceReport {
  return {
    fingerprint: id,
    ordinalAlias: id,
    transport: Mode.ModeHID,
    path: id,
    vendorId: 1,
    productId: 2,
    vendor: Vendor.VendorUnknown,
    product: id,
  };
}

function snapshot(item: DeviceReport, selectionId = `authenticator-${item.fingerprint}`): ActiveSelection {
  return {
    id: selectionId,
  } as ActiveSelection;
}

function inspectEnvelope(item: DeviceReport) {
  return {
    operationId: `inspect-${item.fingerprint}`,
    selectionId: `authenticator-${item.fingerprint}`,
    kind: OperationKind.Inspect,
    authenticatorClosed: false,
    result: {
      device: item,
      info: {
        versions: [],
        aaguid: "",
        options: {},
        assessment: new Assessment(),
        conformance: new Report(),
      },
    },
  };
}

function bioSensorEnvelope(item: DeviceReport): BioSensorEnvelope {
  return {
    operationId: `bio-${item.fingerprint}`,
    selectionId: `authenticator-${item.fingerprint}`,
    kind: OperationKind.BioSensorInfo,
    result: {
      device: item,
      supported: false,
      previewOnly: false,
    },
  } as BioSensorEnvelope;
}

function credentialsEnvelope(item: DeviceReport, selectionId = `authenticator-${item.fingerprint}`, credentialIDHex = "cafe"): CredentialsEnvelope {
  return {
    operationId: `credentials-${item.fingerprint}`,
    selectionId,
    kind: OperationKind.ListCredentials,
    result: {
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
  } as CredentialsEnvelope;
}

function credentialUpdateTarget(credentialIDHex = "cafe") {
  return {
    record: {
      credentialIDHex,
      credentialType: "public-key",
      userIDHex: "01",
      userName: "user@example.com",
      displayName: "Example User",
    },
    rp: { id: "example.com", name: "Example", idHashHex: "abcd" },
    user: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
  };
}

function largeBlobListEnvelope(item: DeviceReport, selectionId = `authenticator-${item.fingerprint}`): LargeBlobListEnvelope {
  return {
    operationId: `large-blobs-${item.fingerprint}`,
    selectionId,
    kind: OperationKind.ListLargeBlobs,
    result: {
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
  } as LargeBlobListEnvelope;
}

describe("controller lifecycle", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
    logController.clear();
    serviceMocks.BioSensorInfo.mockResolvedValue(null);
    serviceMocks.ListCredentials.mockResolvedValue(null);
    serviceMocks.ListLargeBlobs.mockResolvedValue(null);
    serviceMocks.LookupMDS.mockResolvedValue({ result: {} } as MDSLookupEnvelope);
    serviceMocks.ResolveInteraction.mockResolvedValue(true);
  });

  it("auto-selects one discovered authenticator and loads overview once", async () => {
    const token = device("token-1");
    const { bootstrap } = await import("./test-support/controller");
    serviceMocks.Discover.mockResolvedValue({ devices: [token] });
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token) });
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await bootstrap();

    expect(get(selectedSelector)).toBe("token-1");
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ selectionId: "authenticator-token-1" });
  });

  it("auto-selects the first authenticator when discovery returns several", async () => {
    const { bootstrap } = await import("./test-support/controller");
    const first = device("token-1");
    serviceMocks.Discover.mockResolvedValue({ devices: [first, device("token-2")] });
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(first) });
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(first));

    await bootstrap();

    expect(get(selectedSelector)).toBe("token-1");
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ selectionId: "authenticator-token-1" });
  });

  it("loads overview once when navigating back to overview with an existing selected authenticator", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await navigateToScreen("overview");
    await navigateToScreen("overview");

    expect(get(activeScreen)).toBe("overview");
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
  });

  it("loads a fresh inspection when navigating to an invalidated Overview", async () => {
    const token = device("token-1");
    const cached = inspectEnvelope(token);
    const refreshed = inspectEnvelope(token);
    refreshed.operationId = "inspect-refreshed";
    const { navigateToScreen } = await import("./test-support/controller");
    const { invalidateOverviewCache } = await import("./overview-controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedOverviewEnvelopeForTest(cached);
    seedActiveScreenForTest("security");
    serviceMocks.Inspect.mockResolvedValue(refreshed);

    invalidateOverviewCache();
    expect(get(authenticatorInspection).state).toBe("idle");

    await navigateToScreen("overview");

    expect(serviceMocks.Inspect).toHaveBeenCalledOnce();
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ selectionId: "authenticator-token-1" });
    expect(get(authenticatorInspection).data).toBe(refreshed);
  });

  it("loads passkeys once when navigating to passkeys with an existing selected authenticator", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));

    await navigateToScreen("passkeys");
    await navigateToScreen("passkeys");

    expect(get(activeScreen)).toBe("passkeys");
    expect(serviceMocks.ListCredentials).toHaveBeenCalledTimes(1);
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: "",
    });
  });

  it("loads large blobs once when navigating to the screen with an existing selected authenticator", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedActiveScreenForTest("settings");
    serviceMocks.ListLargeBlobs.mockResolvedValue(largeBlobListEnvelope(token));

    await navigateToScreen("large-blobs");
    await navigateToScreen("large-blobs");

    expect(get(activeScreen)).toBe("large-blobs");
    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledTimes(1);
    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: "",
    });
  });

  it("passes forced refresh and PIN verification through large blobs Reload", async () => {
    const token = device("token-1");
    const { reloadLargeBlobs, setLargeBlobsVerificationFlow } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    serviceMocks.ListLargeBlobs.mockResolvedValue(largeBlobListEnvelope(token));
    setLargeBlobsVerificationFlow(VerificationFlow.VerificationFlowPIN);

    await expect(reloadLargeBlobs()).resolves.toBe(true);

    expect(serviceMocks.ListLargeBlobs).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
    });
  });

  it("returns success and passes forced refresh plus PIN verification through Reload", async () => {
    const token = device("token-1");
    const { reloadPasskeys, setPasskeysVerificationFlow } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token));
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);

    await expect(reloadPasskeys()).resolves.toBe(true);

    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
    });
  });

  it("reopens an errored selected authenticator and preserves stale inventory until forced refresh succeeds", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./test-support/controller");
    const previous = credentialsEnvelope(token, "authenticator-expired", "cafe");
    const refreshed = credentialsEnvelope(token, "authenticator-reopened", "bead");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeAuthenticatorClosed));
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token, "authenticator-reopened") });

    let resolveRefresh!: (envelope: CredentialsEnvelope) => void;
    const pendingRefresh = new Promise<CredentialsEnvelope>((resolve) => {
      resolveRefresh = resolve;
    });
    serviceMocks.ListCredentials.mockReturnValueOnce(pendingRefresh);

    const recovery = reloadPasskeys();
    await vi.waitFor(() => expect(serviceMocks.ListCredentials).toHaveBeenCalledTimes(1));

    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-reopened",
      verificationFlow: "",
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "refreshing",
      lastSuccessfulEnvelope: previous,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);

    resolveRefresh(refreshed);
    await expect(recovery).resolves.toBe(true);
    expect(get(authenticatorStatus)).toMatchObject({ state: "ready", selectionId: "authenticator-reopened" });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "ready",
      lastSuccessfulEnvelope: refreshed,
      responseEnvelope: refreshed,
      runtimeError: null,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(refreshed);
  });

  it("preserves last-known-good inventory when reopening the selected authenticator fails", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./test-support/controller");
    const previous = credentialsEnvelope(token, "authenticator-expired", "cafe");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeAuthenticatorClosed));
    serviceMocks.SetSelection.mockRejectedValueOnce(new Error("authenticator bridge offline"));

    await expect(reloadPasskeys()).resolves.toBe(false);

    expect(get(selectedSelector)).toBe("token-1");
    expect(get(authenticatorStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeInternalError),
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: previous,
      responseEnvelope: null,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
  });

  it("keeps recovered inventory stale when its forced refresh returns an error envelope", async () => {
    const token = device("token-1");
    const { reloadPasskeys } = await import("./test-support/controller");
    const previous = credentialsEnvelope(token, "authenticator-expired", "cafe");
    const refreshError = {
      operationId: "refresh-1",
      selectionId: "authenticator-reopened",
      kind: OperationKind.ListCredentials,
      error: failureForCode(Code.CodeTransportFailure),
    } as CredentialsEnvelope;
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    seedPasskeysEnvelopeForTest(previous);
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeAuthenticatorClosed));
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token, "authenticator-reopened") });
    serviceMocks.ListCredentials.mockResolvedValue(refreshError);

    await expect(reloadPasskeys()).resolves.toBe(false);

    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-reopened",
      verificationFlow: "",
    });
    expect(get(passkeysInventoryState)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: previous,
      responseEnvelope: refreshError,
      runtimeError: null,
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBe(previous);
    expect(get(authenticatorStatus)).toMatchObject({ state: "ready", selectionId: "authenticator-reopened" });
  });

  it("reconciles credential selection after a successful refresh", async () => {
    const token = device("token-1");
    const { loadPasskeys, selectPasskeyCredential } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token, "authenticator-token-1", "cafe"));
    selectPasskeyCredential("cafe");
    serviceMocks.ListCredentials.mockResolvedValue(credentialsEnvelope(token, "authenticator-token-1", "bead"));

    await loadPasskeys();

    expect(get(passkeysSelectedCredentialID)).toBe("");
  });

  it("passes PIN verification into credential delete dry-runs", async () => {
    const token = device("token-1");
    const { beginCredentialDelete, setPasskeysVerificationFlow } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    serviceMocks.DeleteCredential.mockResolvedValue({
      operationId: "delete-preview-1",
      selectionId: "authenticator-token-1",
      kind: OperationKind.DeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.com" },
        result: null,
      },
    });

    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(serviceMocks.DeleteCredential).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      dryRun: true,
    });
    expect(get(passkeysMutation)).toMatchObject({ kind: "delete", phase: "review" });
  });

  it("reopens an invalid selected authenticator before repeating a credential delete preview", async () => {
    const token = device("token-1");
    const { beginCredentialDelete } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token, "authenticator-expired"));
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token, "authenticator-reopened") });
    serviceMocks.DeleteCredential.mockResolvedValue({
      operationId: "delete-preview-1",
      selectionId: "authenticator-reopened",
      kind: OperationKind.DeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.com" },
        result: null,
      },
    });

    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.DeleteCredential).toHaveBeenCalledWith({
      selectionId: "authenticator-reopened",
      verificationFlow: "",
      credentialIdHex: "cafe",
      dryRun: true,
    });
  });

  it("reopens an invalid selected authenticator before repeating a large-blob delete preview", async () => {
    const token = device("token-1");
    const { beginLargeBlobDelete } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    seedLargeBlobsEnvelopeForTest(largeBlobListEnvelope(token, "authenticator-expired"));
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token, "authenticator-reopened") });
    serviceMocks.DeleteLargeBlob.mockResolvedValue(new LargeBlobMutationEnvelope({
      operationId: "large-blob-delete-preview-1",
      selectionId: "authenticator-reopened",
      kind: OperationKind.DeleteLargeBlob,
      result: new LargeBlobMutationOutput({
        preview: new MutationPreview({
          operation: MutationOperation.MutationDelete,
        }),
        result: null,
      }),
    }));

    expect(await beginLargeBlobDelete("cafe")).toBe(true);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.DeleteLargeBlob).toHaveBeenCalledWith({
      selectionId: "authenticator-reopened",
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
    } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "update-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
        result: {
          preview,
          result: {
            deviceFingerprint: "token-1",
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
      selectionId: "authenticator-token-1",
      verificationFlow: "",
      target: credentialUpdateTarget(),
      name: "",
      nameProvided: true,
      dryRun: true,
    };
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenNthCalledWith(1, previewRequest);

    expect(await confirmCredentialUpdate()).toBe(true);
    expect(serviceMocks.UpdateCredentialUser).toHaveBeenNthCalledWith(2, {
      ...previewRequest,
      dryRun: false,
    });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: "",
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
    } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "update-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
        result: {
          preview,
          result: {
            deviceFingerprint: "token-1",
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
    const { beginCredentialDelete, confirmCredentialDelete } = await import("./test-support/controller");
    const inventory = credentialsEnvelope(token);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
        selectionId: "authenticator-token-1",
        kind: OperationKind.DeleteCredential,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce({
        operationId: "delete-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.DeleteCredential,
        result: {
          preview,
          result: {
            deviceFingerprint: "token-1",
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
      selectionId: "authenticator-token-1",
      verificationFlow: "",
      credentialIdHex: "cafe",
      dryRun: true,
    };
    expect(serviceMocks.DeleteCredential).toHaveBeenNthCalledWith(1, previewRequest);

    expect(await confirmCredentialDelete()).toBe(true);
    expect(serviceMocks.DeleteCredential).toHaveBeenNthCalledWith(2, {
      ...previewRequest,
      dryRun: false,
    });
    expect(serviceMocks.ListCredentials).toHaveBeenCalledWith({
      selectionId: "authenticator-token-1",
      verificationFlow: "",
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
    } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
      selectionId: "authenticator-token-1",
      kind: OperationKind.UpdateCredentialUser,
      error: failureForCode(Code.CodeTransportFailure),
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
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

  it("clears an invalid mutation authenticator without reissuing its reviewed request", async () => {
    const token = device("token-1");
    const {
      beginCredentialUpdate,
      confirmCredentialUpdate,
      previewCredentialUpdate,
      updateCredentialDraft,
    } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    const preview = {
      credentialIDHex: "cafe",
      rpID: "example.com",
      current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      warnings: [],
    };
    const invalidSelectionEnvelope = {
      operationId: "update-1",
      selectionId: "authenticator-token-1",
      kind: OperationKind.UpdateCredentialUser,
      error: failureForCode(Code.CodeAuthenticatorClosed),
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
        result: { preview, result: null },
      })
      .mockResolvedValueOnce(invalidSelectionEnvelope);

    expect(beginCredentialUpdate("cafe")).toBe(true);
    expect(updateCredentialDraft({ name: "updated@example.com" })).toBe(true);
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);

    expect(get(authenticatorStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    expect(get(authenticatorStatus).selectionId).toBeUndefined();
    expect(get(passkeysMutation)).toMatchObject({
      kind: "update",
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: invalidSelectionEnvelope,
    });

    expect(serviceMocks.UpdateCredentialUser).toHaveBeenCalledTimes(2);
    expect(serviceMocks.ListCredentials).not.toHaveBeenCalled();
  });

  it("stores a null response and a separate runtime error when mutation preview throws", async () => {
    const token = device("token-1");
    const { beginCredentialUpdate, previewCredentialUpdate, updateCredentialDraft } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
    } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
      selectionId: "authenticator-token-1",
      kind: OperationKind.UpdateCredentialUser,
      result: { preview, result: null },
    };
    serviceMocks.UpdateCredentialUser
      .mockResolvedValueOnce({
        operationId: "update-preview-1",
        selectionId: "authenticator-token-1",
        kind: OperationKind.UpdateCredentialUser,
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
    const { loadPasskeys } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
    const { loadPasskeys } = await import("./test-support/controller");
    const envelope = {
      operationId: "credentials-token-1",
      selectionId: "authenticator-token-1",
      kind: OperationKind.ListCredentials,
    } as CredentialsEnvelope;
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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

  it("turns invalid authenticator responses into a authenticator error without retaining the expired authenticator id", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);
    serviceMocks.ListCredentials.mockResolvedValue({
      operationId: "credentials-token-1",
      selectionId: "authenticator-token-1",
      kind: OperationKind.ListCredentials,
      authenticatorClosed: false,
      error: failureForCode(Code.CodeAuthenticatorClosed),
    } as CredentialsEnvelope);

    await loadPasskeys();

    expect(get(authenticatorStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    expect(get(authenticatorStatus).selectionId).toBeUndefined();
    expect(get(pendingInteraction)).toBeNull();
  });

  it("honors a closed-authenticator postcondition on the first transport failure", async () => {
    const token = device("token-1");
    const { loadPasskeys } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("passkeys");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);
    const transportFailure = failureForCode(Code.CodeTransportFailure);
    serviceMocks.ListCredentials.mockResolvedValue({
      operationId: "credentials-token-1",
      selectionId: "authenticator-token-1",
      kind: OperationKind.ListCredentials,
      authenticatorClosed: true,
      error: transportFailure,
    } as CredentialsEnvelope);

    await loadPasskeys();

    expect(get(authenticatorStatus)).toEqual({ state: "error", error: transportFailure });
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
    } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
    await selectLargeBlobCredential("cafe");
    setLargeBlobsQuery("example");
    setLargeBlobsStatusFilter("present");
    setLargeBlobsVerificationFlow(VerificationFlow.VerificationFlowPIN);
    setLargeBlobsPayloadEncoding("hex");
    expect(beginLargeBlobWrite("cafe")).toBe(true);
    seedPendingInteractionForTest({
      interactionId: "interaction-1",
      operationId: "operation-1",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);
	logController.recordRuntimeFailure("selection-survivor", new Error("not persisted"));

    await selectToken("");

    expect(get(selectedSelector)).toBe("");
    expect(get(authenticatorInspection).data).toBeNull();
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
    expect(logController.records.some((record) => record.source === "app/runtime" && record.context === "selection-survivor")).toBe(true);
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
    } = await import("./test-support/controller");
    seedDevicesForTest([first, second]);
    seedActiveScreenForTest("settings");
    seedSelectionForTest("token-1", first, {
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(first));
    selectPasskeyCredential("cafe");
    setPasskeysQuery("example");
    setPasskeysVerificationFlow(VerificationFlow.VerificationFlowPIN);
    expect(beginCredentialUpdate("cafe")).toBe(true);
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(second) });

    await selectToken("token-2");

    expect(get(selectedSelector)).toBe("token-2");
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(get(passkeysQuery)).toBe("");
    expect(get(passkeysSelectedCredentialID)).toBe("");
    expect(get(passkeysMutation)).toEqual({ kind: "idle", phase: "idle" });
    expect(get(passkeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-2" });
  });

  it("switches authenticators with one atomic selection call", async () => {
    const first = device("token-1");
    const second = device("token-2");
    const { selectToken } = await import("./test-support/controller");
    seedDevicesForTest([first, second]);
    seedSelectionForTest("token-1", first, {
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(second) });

    await selectToken("token-2");

    expect(get(selectedSelector)).toBe("token-2");
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-2",
    });
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-2" });
  });

  it("reports an atomic selection failure", async () => {
    const first = device("token-1");
    const second = device("token-2");
    const { selectToken } = await import("./test-support/controller");
    seedDevicesForTest([first, second]);
    seedSelectionForTest("token-1", first, {
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    serviceMocks.SetSelection.mockRejectedValue(new Error("request has been stopped"));

    await selectToken("token-2");

    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-2" });
    expect(get(authenticatorStatus)).toMatchObject({
      state: "error",
      error: expect.objectContaining({ code: Code.CodeInternalError }),
    });
  });

  it("delegates repeated selection to the runtime singleton", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedSelectionForTest("token-1", token, {
      state: "running",
      selectionId: "authenticator-token-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(token));
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token) });

    await selectToken("token-1");

    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-1",
    });
    expect(get(passkeysInventoryState).lastSuccessfulEnvelope).toBeNull();
    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
  });

  it("reports the concrete authenticator-open failure when device selection cannot open", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    serviceMocks.SetSelection.mockRejectedValue(new Error("authenticator open failed", {
      cause: failureForCode(Code.CodeDeviceUnavailable),
    }));

    await selectToken("token-1");

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The authenticator is unavailable.",
    });
  });

  it("keeps overview transport failures as load errors without synthetic inspect envelopes", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    serviceMocks.Inspect.mockRejectedValue(new Error("inspect bridge offline"));

    await loadOverview();

    expect(get(authenticatorInspection).data).toBeNull();
    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome?.message).toBe("The operation failed because of an internal error.");
  });

  it("loads authenticator inspection on Lab entry without starting Overview-only subloads", async () => {
    const token = device("token-1");
    const envelope = inspectEnvelope(token);
    envelope.result.info.options = { bioEnroll: true };
    const { maybeLoadOverview } = await import("./overview-controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("lab");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    serviceMocks.Inspect.mockResolvedValue(envelope);

    await maybeLoadOverview();

    expect(serviceMocks.Inspect).toHaveBeenCalledOnce();
    expect(serviceMocks.BioSensorInfo).not.toHaveBeenCalled();
    expect(serviceMocks.LookupMDS).not.toHaveBeenCalled();
    expect(get(authenticatorInspection).data).toBe(envelope);
  });

  it("reuses Lab inspection when Overview only needs biometric and MDS details", async () => {
    const token = device("token-1");
    const envelope = inspectEnvelope(token);
    envelope.result.info.options = { bioEnroll: true };
    const { maybeLoadOverview } = await import("./overview-controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    seedOverviewEnvelopeForTest(envelope);
    serviceMocks.BioSensorInfo.mockResolvedValue(bioSensorEnvelope(token));

    await maybeLoadOverview();

    expect(serviceMocks.Inspect).not.toHaveBeenCalled();
    expect(serviceMocks.BioSensorInfo).toHaveBeenCalledWith({ selectionId: "authenticator-token-1" });
    expect(get(authenticatorInspection).data).toBe(envelope);
  });

  it("reopens an invalid selected authenticator before reloading overview", async () => {
    const token = device("token-1");
    const { reloadOverview } = await import("./test-support/controller");
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, {
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });
    serviceMocks.SetSelection.mockResolvedValue({ selection: snapshot(token, "authenticator-reopened") });
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await reloadOverview();

    expect(serviceMocks.SetSelection).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ selectionId: "authenticator-reopened" });
    expect(get(authenticatorStatus)).toMatchObject({ state: "ready", selectionId: "authenticator-reopened" });
  });

  it("keeps a failed Inspect response as its typed envelope and exact kit error", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./test-support/controller");
    const envelope = {
      operationId: "inspect-error",
      selectionId: "authenticator-token-1",
      kind: OperationKind.Inspect,
      error: failureForCode(Code.CodeAuthenticatorBusy),
    };
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
    serviceMocks.Inspect.mockResolvedValue(envelope);

    await loadOverview();

    expect(get(authenticatorInspection)).toMatchObject({
      state: "error",
      data: envelope,
      error: failureForCode(Code.CodeAuthenticatorBusy),
    });
    expect(get(statusBar).lastOutcome?.message).toBe("The authenticator is busy processing another request.");
  });

  it("keeps a biometric sub-load failure visible instead of overwriting it with inspect success", async () => {
    const token = device("token-1");
    const { loadOverview } = await import("./test-support/controller");
    const envelope = inspectEnvelope(token);
    envelope.result.info.options = { bioEnroll: true };
    seedDevicesForTest([token]);
    seedActiveScreenForTest("overview");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });
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
    const { handleOperationProgress } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });

    handleOperationProgress({
      operationId: "operation-current",
      selectionId: "authenticator-token-1",
      event: { stage: "enumerating-rps", message: "current" },
    } as OperationEventEnvelope);

    expect(get(statusBar).activeOperation?.operationId).toBe("operation-current");
  });

  it("exposes interaction prompts from the runtime", async () => {
    const token = device("token-1");
    const { handleInteractionRequested } = await import("./test-support/controller");
    seedSelectionForTest("token-1", token, { state: "ready", selectionId: "authenticator-token-1" });

    handleInteractionRequested({
      interactionId: "interaction-current",
      operationId: "operation-current",
      selectionId: "authenticator-token-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);

    expect(get(pendingInteraction)?.interactionId).toBe("interaction-current");
    expect(serviceMocks.ResolveInteraction).not.toHaveBeenCalled();
  });

  it("keeps the interaction pending until Wails resolves it and clears the typed PIN DTO", async () => {
    const { answerPendingInteraction } = await import("./test-support/controller");
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
    const { answerPendingInteraction, handleInteractionRequested } = await import("./test-support/controller");
    seedPendingInteractionForTest({ interactionId: "interaction-1" } as InteractionPrompt);
    serviceMocks.ResolveInteraction.mockImplementationOnce(async () => {
      handleInteractionRequested({
        interactionId: "interaction-2",
        operationId: "operation-1",
        selectionId: "authenticator-1",
        request: { kind: "pin" },
      } as InteractionPrompt);
      return true;
    });

    await answerPendingInteraction(new InteractionAnswer({
      interactionId: "interaction-1",
      pin: "1234",
    }));

    expect(get(pendingInteraction)?.interactionId).toBe("interaction-2");
  });

  it("preserves a typed interaction failure code in the UI outcome", async () => {
    const { answerPendingInteraction } = await import("./test-support/controller");
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
    }))).resolves.toBe(false);

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "error",
      message: "The PIN is incorrect.",
    });
    expect(get(pendingInteraction)).toBeNull();
  });
});
