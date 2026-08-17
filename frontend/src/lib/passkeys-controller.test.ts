import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/telesma-app/kit";
import type { CredentialTarget } from "../../bindings/github.com/telesma-app/kit/model/credentials";
import { Kind as OperationKind } from "../../bindings/github.com/telesma-app/kit/model/operation";
import { Code } from "../../bindings/github.com/telesma-app/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/telesma/service";
import { testHIDDevice, testSmartCardDevice } from "../test/device.js";

import { api } from "$lib/api";
import { failureForCode } from "$lib/test-support/failure";
import {
  beginPasskeyDirectoryLookup,
  completePasskeyDirectoryLookup,
  completePasskeysInventoryLoad,
  failPasskeysInventoryLoadAtRuntime,
  passkeyDirectoryState,
  passkeysInventoryState,
  passkeysMutation,
  resetPasskeysDeviceState,
  resetPasskeysStateForTest,
} from "$lib/features/passkeys/state";
import { resetAuthenticatorStateForTest } from "$lib/features/authenticator/state";
import { resetWorkbenchStateForTest } from "$lib/features/workbench/state";
import {
  cancelOperationRecovery,
  operationRecovery,
  retryOperationRecovery,
} from "$lib/operation-recovery.js";
import { setPasskeyDirectoryEnabled } from "$lib/preferences";
import {
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils.js";
import {
  beginCredentialDelete,
  beginCredentialUpdate,
  buildCredentialUpdatePreviewRequest,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  normalizeCredentialUpdateForm,
  loadPasskeys,
  maybeLoadPasskeys,
  previewCredentialUpdate,
  updateCredentialDraft,
  validateCredentialUpdate,
} from "$lib/passkeys-controller";

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
      groups: [
        {
          rpID: "example.test",
          credentials: [
            {
              credentialIDHex: "cafe",
              userIDHex: "01",
              userName: "user",
              displayName: "Old name",
            },
          ],
        },
      ],
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
  setPasskeyDirectoryEnabled(false);
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetPasskeysStateForTest();
  seedSelectionForTest("token-1", null, {
    state: "ready",
    selectionId: "authenticator-1",
  });
  completePasskeysInventoryLoad(inventoryEnvelope().result!, "2026-07-12T00:00:00.000Z");
});

afterEach(() => {
  cancelOperationRecovery();
  vi.restoreAllMocks();
});

describe("passkeys mutation requests", () => {
  it("does not call Passkey Directory while the opt-in is disabled", async () => {
    const list = vi.spyOn(api, "listCredentials").mockResolvedValue(inventoryEnvelope());
    const lookup = vi.spyOn(api, "lookupPasskeyDirectory").mockResolvedValue({
      matches: [],
    });

    expect(await loadPasskeys()).toBe(true);
    expect(list).toHaveBeenCalledOnce();
    expect(lookup).not.toHaveBeenCalled();
    expect(get(passkeyDirectoryState).phase).toBe("idle");
  });

  it("passes inventory RP IDs to one directory lookup", async () => {
    vi.spyOn(api, "saveApplicationConfig").mockResolvedValue();
    setPasskeyDirectoryEnabled(true);

    const envelope = inventoryEnvelope();

    envelope.result!.groups!.push({
      rpID: "EXAMPLE.TEST.",
      credentials: [],
    });

    vi.spyOn(api, "listCredentials").mockResolvedValue(envelope);
    const lookup = vi.spyOn(api, "lookupPasskeyDirectory").mockResolvedValue({
      matches: [],
    });

    expect(await loadPasskeys()).toBe(true);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    expect(lookup).toHaveBeenCalledWith({ rpIDs: ["example.test", "EXAMPLE.TEST."] });
  });

  it("looks up a retained in-memory inventory when entering Passkeys", async () => {
    vi.spyOn(api, "saveApplicationConfig").mockResolvedValue();
    setPasskeyDirectoryEnabled(true);
    seedActiveScreenForTest("passkeys");

    const lookup = vi.spyOn(api, "lookupPasskeyDirectory").mockResolvedValue({
      matches: [],
    });

    await maybeLoadPasskeys();
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledWith({ rpIDs: ["example.test"] }));
    await vi.waitFor(() => expect(get(passkeyDirectoryState).phase).toBe("ready"));
    await maybeLoadPasskeys();
    expect(lookup).toHaveBeenCalledOnce();
  });

  it("keeps directory failures separate and clears lookup state at the device boundary", async () => {
    vi.spyOn(api, "saveApplicationConfig").mockResolvedValue();
    setPasskeyDirectoryEnabled(true);
    vi.spyOn(api, "listCredentials").mockResolvedValue(inventoryEnvelope());
    vi.spyOn(api, "lookupPasskeyDirectory").mockRejectedValue(new Error("offline"));

    expect(await loadPasskeys()).toBe(true);
    await vi.waitFor(() => expect(get(passkeyDirectoryState).phase).toBe("unavailable"));
    expect(get(passkeysInventoryState).report).not.toBeNull();

    const lookupID = beginPasskeyDirectoryLookup();
    const result = {
      matches: [],
    };

    completePasskeyDirectoryLookup(lookupID, result);
    resetPasskeysDeviceState();
    completePasskeyDirectoryLookup(lookupID, result);

    expect(get(passkeyDirectoryState).phase).toBe("idle");
  });

  it("recovers inventory loading through the shared operation lifecycle", async () => {
    const firstCard = testSmartCardDevice("card-1");
    const secondCard = testSmartCardDevice("card-2");

    seedDevicesForTest([firstCard]);
    seedSelectionForTest(firstCard.attachment.id, firstCard, {
      state: "ready",
      selectionId: "authenticator-card-1",
    });

    const denied = inventoryEnvelope();

    denied.error = failureForCode(Code.CodeUserPresenceRequired);
    denied.result = null;

    const responses = [denied, inventoryEnvelope()];
    const listCredentials = vi
      .spyOn(api, "listCredentials")
      .mockImplementation(() => Promise.resolve(responses.shift()!));

    const loading = loadPasskeys();

    await vi.waitFor(() => expect(get(operationRecovery)).not.toBeNull());
    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    seedDevicesForTest([secondCard]);
    seedSelectionForTest(secondCard.attachment.id, secondCard, {
      state: "ready",
      selectionId: "authenticator-card-2",
    });
    expect(retryOperationRecovery()).toBe(true);

    await expect(loading).resolves.toBe(true);
    expect(listCredentials).toHaveBeenCalledTimes(2);
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
  ] as const)(
    "classifies response code %s without discarding stale inventory",
    async (code, phase) => {
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
    },
  );

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
      VerificationFlow.VerificationFlowPIN,
      target,
      { name: "", displayName: " Changed " },
    );

    expect(request.target).toBe(target);
    expect(request).toEqual({
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
      VerificationFlow.VerificationFlowPIN,
      updateTarget(),
      { name: " user ", displayName: "Old name" },
    );

    expect(request).toEqual({
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
    expect(
      validateCredentialUpdate(
        { name: " user ", displayName: "User" },
        { name: "user", displayName: " User " },
      ),
    ).toBe("no-changes");
  });

  it("reconfirms after any execution failure without rebuilding the preview", async () => {
    const executionFailure = updatePreviewEnvelope();

    executionFailure.error = failureForCode(Code.CodeTransportFailure);

    const update = vi
      .spyOn(api, "updateCredentialUser")
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

    const remove = vi
      .spyOn(api, "deleteCredential")
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
