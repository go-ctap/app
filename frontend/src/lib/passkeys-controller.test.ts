import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationKind,
  VerificationFlow,
} from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import { api } from "./api";
import { failureForCode } from "./failure";
import {
  completePasskeysInventoryLoad,
  passkeysMutation,
  resetPasskeysStateForTest,
} from "./features/passkeys/state";
import { resetSessionStateForTest, selectedSelector, sessionStatus } from "./features/session/state";
import { resetWorkbenchStateForTest } from "./features/workbench/state";
import {
  beginCredentialUpdate,
  buildCredentialUpdatePreviewRequest,
  confirmCredentialUpdate,
  normalizeCredentialUpdateForm,
  previewCredentialUpdate,
  retryPasskeysMutation,
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
        device: { deviceId: "token-1", stableId: true },
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

  it("retries an execution failure through refresh and a new preview without auto-confirming", async () => {
    const executionFailure = updatePreviewEnvelope();
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const update = vi.spyOn(api, "updateCredentialUser")
      .mockResolvedValueOnce(updatePreviewEnvelope())
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(updatePreviewEnvelope());
    const list = vi.spyOn(api, "listCredentials").mockResolvedValue(inventoryEnvelope());

    expect(beginCredentialUpdate("cafe")).toBe(true);
    updateCredentialDraft({ displayName: "New name" });
    expect(await previewCredentialUpdate()).toBe(true);
    expect(await confirmCredentialUpdate()).toBe(false);
    expect(get(passkeysMutation)).toMatchObject({ phase: "error", failedPhase: "executing" });

    expect(await retryPasskeysMutation()).toBe(true);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ refresh: true }));
    expect(update).toHaveBeenCalledTimes(3);
    expect(update.mock.calls[1][0]).toMatchObject({ dryRun: false, confirmed: true });
    expect(update.mock.calls[2][0]).toMatchObject({ dryRun: true });
    expect(update.mock.calls[2][0].confirmed).not.toBe(true);
    expect(get(passkeysMutation)).toMatchObject({ kind: "update", phase: "review" });
  });
});
