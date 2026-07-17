import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationKind,
  VerificationFlow,
} from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import { api } from "./api";
import { failureForCode } from "./test-failure";
import {
  completePasskeysInventoryLoad,
  failPasskeysInventoryLoadAtRuntime,
  resetPasskeysStateForTest,
} from "./features/passkeys/state";
import { resetSessionStateForTest, selectedSelector, sessionStatus } from "./features/session/state";
import { resetWorkbenchStateForTest } from "./features/workbench/state";
import {
  beginCredentialDelete,
  beginCredentialUpdate,
  buildCredentialUpdatePreviewRequest,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  normalizeCredentialUpdateForm,
  previewCredentialUpdate,
  updateCredentialDraft,
  validateCredentialUpdate,
} from "./passkeys-controller";

function inventoryEnvelope(): CredentialsEnvelope {
  return {
    operationId: "list-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListCredentials,
    result: {
      report: {
        device: { fingerprint: "token-1" },
        support: { credentialManagement: true, previewOnly: false, readOnlyPermission: false },
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
    },
  } as CredentialsEnvelope;
}

function updatePreviewEnvelope(): CredentialUpdateEnvelope {
  return {
    operationId: "preview-1",
    sessionId: "session-1",
    kind: OperationKind.OperationUpdateCredentialUser,
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
    deviceFingerprint: "token-1",
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
    sessionId: "session-1",
    kind: OperationKind.OperationDeleteCredential,
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
    deviceFingerprint: "token-1",
    credentialIDHex: "cafe",
    rpID: "example.test",
    userIDHex: "01",
  };
  return envelope;
}

beforeEach(() => {
  resetSessionStateForTest();
  resetWorkbenchStateForTest();
  resetPasskeysStateForTest();
  selectedSelector.set("token-1");
  sessionStatus.set({ state: "ready", sessionId: "session-1" });
  completePasskeysInventoryLoad(inventoryEnvelope(), "2026-07-12T00:00:00.000Z");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("passkeys mutation requests", () => {
  it("allows update and delete from last-known-good rows after refresh fails", async () => {
    failPasskeysInventoryLoadAtRuntime(failureForCode(Code.CodeTransportFailure));

    expect(beginCredentialUpdate("cafe")).toBe(true);
    closePasskeysMutation();

    const remove = vi.spyOn(api, "deleteCredential").mockResolvedValue(deletePreviewEnvelope());
    expect(await beginCredentialDelete("cafe")).toBe(true);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("marks only normalized fields that actually changed", () => {
    const request = buildCredentialUpdatePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      { userIDHex: "AABB", name: "old", displayName: "Visible" },
      { userIDHex: " aabb ", name: "", displayName: " Changed " },
    );

    expect(request).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      name: "",
      nameProvided: true,
      displayName: "Changed",
      displayProvided: true,
      dryRun: true,
    });
    expect(request).not.toHaveProperty("userIdHex");
    expect(request).not.toHaveProperty("userIdProvided");
  });

  it("marks a genuinely changed normalized user ID exactly", () => {
    const request = buildCredentialUpdatePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      { userIDHex: "AABB", name: "user", displayName: "Visible" },
      { userIDHex: " ccDD ", name: " user ", displayName: "Visible" },
    );

    expect(request).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      userIdHex: "ccdd",
      userIdProvided: true,
      dryRun: true,
    });
    expect(request).not.toHaveProperty("nameProvided");
    expect(request).not.toHaveProperty("displayProvided");
  });

  it("normalizes hex and validates required, even-length user IDs", () => {
    expect(normalizeCredentialUpdateForm({ userIDHex: " AAbb ", name: " User ", displayName: " Display " })).toEqual({
      userIDHex: "aabb",
      name: "User",
      displayName: "Display",
    });
    expect(validateCredentialUpdate(
      { userIDHex: "aa", name: "user", displayName: "User" },
      { userIDHex: "", name: "user", displayName: "User" },
    )).toBe("user-id-required");
    expect(validateCredentialUpdate(
      { userIDHex: "aa", name: "user", displayName: "User" },
      { userIDHex: "abc", name: "user", displayName: "User" },
    )).toBe("user-id-invalid-hex");
    expect(validateCredentialUpdate(
      { userIDHex: "AA", name: " user ", displayName: "User" },
      { userIDHex: "aa", name: "user", displayName: " User " },
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
      prepareInventoryRefresh: true,
      confirmed: true,
    });
    expect(update.mock.calls[2][0]).toMatchObject({
      dryRun: false,
      prepareInventoryRefresh: true,
      confirmed: true,
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
      prepareInventoryRefresh: true,
      confirmed: true,
    });
    expect(remove.mock.calls[2][0]).toMatchObject({
      dryRun: false,
      prepareInventoryRefresh: true,
      confirmed: true,
    });
  });
});
