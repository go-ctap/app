import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import type { CredentialTarget } from "../../bindings/github.com/go-ctap/kit/model/credentials";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/telesma/service";
import { testHIDDevice, testSmartCardDevice } from "../test/device.js";

import { api } from "./api";
import { failureForCode } from "./test-failure";
import {
  completePasskeysInventoryLoad,
  credentialStoreStateState,
  failPasskeysInventoryLoadAtRuntime,
  passkeysInventoryState,
  passkeysMutation,
  resetPasskeysStateForTest,
} from "./features/passkeys/state";
import {
  devices,
  resetAuthenticatorStateForTest,
  selectedDevice,
  selectedSelector,
  authenticatorStatus,
} from "./features/authenticator/state";
import { resetWorkbenchStateForTest } from "./features/workbench/state";
import {
  cancelOperationRecovery,
  operationRecovery,
  retryOperationRecovery,
} from "./operation-recovery.js";
import {
  beginCredentialDelete,
  beginCredentialUpdate,
  buildCredentialUpdatePreviewRequest,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  normalizeCredentialUpdateForm,
  loadCredentialStoreState,
  loadPasskeys,
  previewCredentialUpdate,
  updateCredentialDraft,
  validateCredentialUpdate,
} from "./passkeys-controller";

function inventoryEnvelope(readOnlyPermission = true): CredentialsEnvelope {
  return {
    operationId: "list-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    result: {
      device: testHIDDevice(),
      support: { credentialManagement: true, previewOnly: false, readOnlyPermission },
      summary: {
        existingResidentCredentialsCount: 1,
        maxPossibleRemainingResidentCredentialsCount: 0,
        totalRPs: 1,
        totalCredentials: 1,
      },
      groups: [{
        rpID: "example.test",
        credentials: [{
          credentialIDHex: "cafe",
          userIDHex: "01",
          userName: "user",
          displayName: "Old name",
        }],
      }],
    },
  } as CredentialsEnvelope;
}

function updateTarget(): CredentialTarget {
  const record = {
    credentialIDHex: "cafe",
    userIDHex: "01",
    userName: "user",
    displayName: "Old name",
  };

  return {
    record,
    rp: { id: "example.test" },
    user: { userIDHex: "01", name: "user", displayName: "Old name" },
  };
}

function updatePreviewEnvelope(): CredentialUpdateEnvelope {
  return {
    operationId: "preview-1",
    selectionId: "authenticator-1",
    kind: OperationKind.UpdateCredentialUser,
    result: {
      preview: {
        credentialIDHex: "cafe",
        rpID: "example.test",
        current: { userIDHex: "01", name: "user", displayName: "Old name" },
        proposed: { userIDHex: "01", name: "user", displayName: "New name" },
      },
      result: null,
    },
  } as CredentialUpdateEnvelope;
}

function storeStateEnvelope(): CredentialStoreStateEnvelope {
  return {
    operationId: "store-state-1",
    selectionId: "authenticator-1",
    kind: OperationKind.CredentialStoreState,
    result: {
      authenticatorIdentifierHex: "000102030405060708090a0b0c0d0e0f",
      credentialStoreStateHex: "101112131415161718191a1b1c1d1e1f",
    },
  } as CredentialStoreStateEnvelope;
}

function updateResultEnvelope(): CredentialUpdateEnvelope {
  const envelope = updatePreviewEnvelope();
  envelope.operationId = "update-1";
  envelope.result!.result = {
    attachmentId: "token-1",
    credentialIDHex: "cafe",
    rpID: "example.test",
    previous: { userIDHex: "01", name: "user", displayName: "Old name" },
    current: { userIDHex: "01", name: "user", displayName: "New name" },
  };
  return envelope;
}

function deletePreviewEnvelope(): CredentialDeleteEnvelope {
  return {
    operationId: "delete-preview-1",
    selectionId: "authenticator-1",
    kind: OperationKind.DeleteCredential,
    result: {
      preview: {
        credentialIDHex: "cafe",
        rpID: "example.test",
        userIDHex: "01",
      },
      result: null,
    },
  } as CredentialDeleteEnvelope;
}

function deleteResultEnvelope(): CredentialDeleteEnvelope {
  const envelope = deletePreviewEnvelope();
  envelope.operationId = "delete-1";
  envelope.result!.result = {
    attachmentId: "token-1",
    credentialIDHex: "cafe",
    rpID: "example.test",
    userIDHex: "01",
  };
  return envelope;
}

beforeEach(() => {
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetPasskeysStateForTest();
  selectedSelector.set("token-1");
  authenticatorStatus.set({ state: "ready", selectionId: "authenticator-1" });
  completePasskeysInventoryLoad(inventoryEnvelope().result!, "2026-07-12T00:00:00.000Z");
});

afterEach(() => {
  cancelOperationRecovery();
  vi.restoreAllMocks();
});

describe("passkeys mutation requests", () => {
  it("recovers inventory loading through the shared operation lifecycle", async () => {
    const firstCard = testSmartCardDevice("card-1");
    const secondCard = testSmartCardDevice("card-2");
    devices.set([firstCard]);
    selectedSelector.set(firstCard.attachment.id);
    selectedDevice.set(firstCard);
    authenticatorStatus.set({ state: "ready", selectionId: "authenticator-card-1" });
    const denied = inventoryEnvelope();
    denied.error = failureForCode(Code.CodeUserPresenceRequired);
    denied.result = null;
    const responses = [denied, inventoryEnvelope()];
    const sentSelectionIds: string[] = [];
    vi.spyOn(api, "listCredentials").mockImplementation((request) => {
      sentSelectionIds.push(request.selectionId);
      return Promise.resolve(responses.shift()!);
    });

    const loading = loadPasskeys();
    await vi.waitFor(() => expect(get(operationRecovery)).not.toBeNull());
    devices.set([]);
    selectedSelector.set("");
    selectedDevice.set(null);
    authenticatorStatus.set({ state: "idle" });
    devices.set([secondCard]);
    selectedSelector.set(secondCard.attachment.id);
    selectedDevice.set(secondCard);
    authenticatorStatus.set({ state: "ready", selectionId: "authenticator-card-2" });
    expect(retryOperationRecovery()).toBe(true);

    await expect(loading).resolves.toBe(true);
    expect(sentSelectionIds).toEqual([
      "authenticator-card-1",
      "authenticator-card-2",
    ]);
  });

  it("loads persistent credential-store state with the selected verification flow", async () => {
    const envelope = storeStateEnvelope();
    const read = vi.spyOn(api, "credentialStoreState").mockResolvedValue(envelope);

    expect(await loadCredentialStoreState()).toBe(true);
    expect(read).toHaveBeenCalledWith({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
    });
    expect(get(credentialStoreStateState)).toEqual({
      phase: "ready",
      responseEnvelope: envelope,
      runtimeError: null,
    });
  });

  it("does not request persistent state without perCredMgmtRO", async () => {
    completePasskeysInventoryLoad(inventoryEnvelope(false).result!, "2026-07-12T00:00:00.000Z");
    const read = vi.spyOn(api, "credentialStoreState");

    expect(await loadCredentialStoreState()).toBe(false);
    expect(read).not.toHaveBeenCalled();
    expect(get(credentialStoreStateState).phase).toBe("idle");
  });

  it("allows update and delete from last-known-good rows after refresh fails", async () => {
    const report = get(passkeysInventoryState).report;
    failPasskeysInventoryLoadAtRuntime();

    expect(get(passkeysInventoryState)).toEqual({
      phase: "error",
      report,
      lastSuccessfulAt: "2026-07-12T00:00:00.000Z",
    });

    expect(beginCredentialUpdate("cafe")).toBe(true);
    closePasskeysMutation();

    const remove = vi.spyOn(api, "deleteCredential").mockResolvedValue(deletePreviewEnvelope());
    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
  });

  it.each([
    [Code.CodeCredentialManagementUnsupported, "unsupported"],
    [Code.CodeVerificationFlowUnsupported, "error"],
  ] as const)("classifies response code %s without discarding stale inventory", async (code, phase) => {
    const report = get(passkeysInventoryState).report;
    const envelope = inventoryEnvelope();
    envelope.error = failureForCode(code);
    envelope.result = null;
    vi.spyOn(api, "listCredentials").mockResolvedValue(envelope);

    expect(await loadPasskeys()).toBe(false);
    expect(get(passkeysInventoryState)).toEqual({
      phase,
      report,
      lastSuccessfulAt: "2026-07-12T00:00:00.000Z",
    });
  });

  it("captures the generated credential target once and sends it unchanged", async () => {
    const report = inventoryEnvelope().result!;
    const record = report.groups![0].credentials![0];
    completePasskeysInventoryLoad(report, "2026-07-12T00:00:00.000Z");
    const update = vi.spyOn(api, "updateCredentialUser").mockResolvedValue(updatePreviewEnvelope());

    expect(beginCredentialUpdate("cafe")).toBe(true);
    const mutation = get(passkeysMutation);
    expect(mutation.kind).toBe("update");
    if (mutation.kind !== "update") return;
    expect(mutation.target).toEqual({
      record,
      rp: { id: "example.test" },
      user: { userIDHex: "01", name: "user", displayName: "Old name" },
    });
    expect(mutation.target.record).toBe(record);

    updateCredentialDraft({ displayName: "New name" });
    expect(await previewCredentialUpdate()).toBe(true);
    expect(update.mock.calls[0][0].target).toBe(mutation.target);
  });

  it("marks only normalized fields that actually changed", () => {
    const target = updateTarget();
    const request = buildCredentialUpdatePreviewRequest(
      "authenticator-1",
      VerificationFlow.VerificationFlowPIN,
      target,
      { name: "", displayName: " Changed " },
    );

    expect(request.target).toBe(target);
    expect(request).toEqual({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      target: {
        record: {
          credentialIDHex: "cafe",
          userIDHex: "01",
          userName: "user",
          displayName: "Old name",
        },
        rp: { id: "example.test" },
        user: { userIDHex: "01", name: "user", displayName: "Old name" },
      },
      name: "",
      nameProvided: true,
      displayName: "Changed",
      displayProvided: true,
      dryRun: true,
    });
    expect(request).not.toHaveProperty("userIdHex");
    expect(request).not.toHaveProperty("userIdProvided");
  });

  it("does not include user ID fields in update requests", () => {
    const request = buildCredentialUpdatePreviewRequest(
      "authenticator-1",
      VerificationFlow.VerificationFlowPIN,
      updateTarget(),
      { name: " user ", displayName: "Old name" },
    );

    expect(request).toEqual({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      target: {
        record: {
          credentialIDHex: "cafe",
          userIDHex: "01",
          userName: "user",
          displayName: "Old name",
        },
        rp: { id: "example.test" },
        user: { userIDHex: "01", name: "user", displayName: "Old name" },
      },
      dryRun: true,
    });
    expect(request).not.toHaveProperty("userIdHex");
    expect(request).not.toHaveProperty("userIdProvided");
    expect(request).not.toHaveProperty("nameProvided");
    expect(request).not.toHaveProperty("displayProvided");
  });

  it("normalizes and validates editable user fields", () => {
    expect(normalizeCredentialUpdateForm({ name: " User ", displayName: " Display " })).toEqual({
      name: "User",
      displayName: "Display",
    });
    expect(validateCredentialUpdate(
      { name: " user ", displayName: "User" },
      { name: "user", displayName: " User " },
    )).toBe("no-changes");
  });

  it("reconfirms after any execution failure without rebuilding the preview", async () => {
    const executionFailure = updatePreviewEnvelope();
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const update = vi.spyOn(api, "updateCredentialUser")
      .mockResolvedValueOnce(updatePreviewEnvelope())
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(updateResultEnvelope());
    const list = vi.spyOn(api, "listCredentials").mockResolvedValue(inventoryEnvelope());

    expect(beginCredentialUpdate("cafe")).toBe(true);
    updateCredentialDraft({ displayName: "New name" });
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);

    expect(await confirmCredentialUpdate()).toBe(true);
    expect(update).toHaveBeenCalledTimes(3);
    expect(update.mock.calls[1][0]).toMatchObject({
      dryRun: false,
    });
    expect(update.mock.calls[2][0]).toMatchObject({
      dryRun: false,
    });
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("reconfirms a delete after any execution failure", async () => {
    const executionFailure = deletePreviewEnvelope();
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const remove = vi.spyOn(api, "deleteCredential")
      .mockResolvedValueOnce(deletePreviewEnvelope())
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(deleteResultEnvelope());
    vi.spyOn(api, "listCredentials").mockResolvedValue(inventoryEnvelope());

    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(await confirmCredentialDelete()).toBe(false);
    expect(await confirmCredentialDelete()).toBe(true);

    expect(remove).toHaveBeenCalledTimes(3);
    expect(remove.mock.calls[1][0]).toMatchObject({
      dryRun: false,
    });
    expect(remove.mock.calls[2][0]).toMatchObject({
      dryRun: false,
    });
  });
});
