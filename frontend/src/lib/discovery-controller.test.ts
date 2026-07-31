import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";
import type {
  AuthenticatorSessionSnapshot,
  DiscoveryChangedEnvelope,
} from "../../bindings/telesma/service";

import { api } from "$lib/api.js";
import {
  bootstrapAuthenticatorSession,
  selectAuthenticatorSession,
} from "$lib/authenticator-controller.js";
import { handleDiscoveryChanged } from "$lib/discovery-controller.js";
import { authenticatorSession } from "$lib/features/authenticator/state.js";
import { labState } from "$lib/features/lab/state.js";
import { statusBar } from "$lib/features/workbench/state.js";
import {
  cancelOperationRecovery,
  offerOperationRecovery,
  operationRecovery,
} from "$lib/operation-recovery.js";
import { failureForCode } from "$lib/test-support/failure.js";
import {
  resetAppStateForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils.js";
import { authenticatorStatus, devices, selectedSelector } from "$lib/test-support/stores.js";
import { testHIDDevice, testSmartCardDevice } from "../test/device.js";

function envelope(snapshot: AuthenticatorSessionSnapshot): DiscoveryChangedEnvelope {
  return { snapshot };
}

describe("discovery controller", () => {
  beforeEach(() => {
    resetAppStateForTest();
    vi.restoreAllMocks();
    vi.spyOn(api, "inspect").mockResolvedValue({
      operationId: "inspect-1",
      selectionId: "selection-1",
      kind: OperationKind.Inspect,
      authenticatorClosed: false,
      error: failureForCode(Code.CodeTransportFailure),
    });
  });

  it("applies the manager-owned session and resets per-device state", async () => {
    const first = testHIDDevice("token-1", "First");
    const second = testHIDDevice("token-2", "Second");

    seedDevicesForTest([first]);
    seedSelectionForTest(first.attachment.id, first, {
      state: "ready",
      selectionId: "selection-1",
    });
    labState.update((state) => ({
      ...state,
      makeDraft: { ...state.makeDraft, rpID: "discard.example" },
    }));

    await handleDiscoveryChanged(
      envelope({
        devices: [first, second],
        selection: { id: "selection-2", attachmentId: second.attachment.id },
      }),
    );

    expect(get(devices)).toEqual([first, second]);
    expect(get(selectedSelector)).toBe(second.attachment.id);
    expect(get(authenticatorStatus)).toEqual({ state: "ready", selectionId: "selection-2" });
    expect(get(labState).makeDraft.rpID).toBe("example.com");
  });

  it("completes bootstrap only after the initial manager event", async () => {
    const device = testHIDDevice("token-1", "Token");

    vi.spyOn(api, "discover").mockResolvedValue(undefined);
    let completed = false;
    const bootstrap = bootstrapAuthenticatorSession().then(() => {
      completed = true;
    });

    await Promise.resolve();
    expect(completed).toBe(false);

    await handleDiscoveryChanged(
      envelope({
        devices: [device],
        selection: { id: "selection-1", attachmentId: device.attachment.id },
      }),
    );
    await bootstrap;

    expect(completed).toBe(true);
    expect(get(selectedSelector)).toBe(device.attachment.id);
  });

  it("keeps state and does not reload for an unchanged manager update", async () => {
    const original = testHIDDevice("token-1", "Original");
    const updated = testHIDDevice("token-1", "Updated");

    seedDevicesForTest([original]);
    seedSelectionForTest(original.attachment.id, original, {
      state: "ready",
      selectionId: "selection-1",
    });
    labState.update((state) => ({
      ...state,
      getDraft: { ...state.getDraft, rpID: "kept.example" },
    }));

    await handleDiscoveryChanged(
      envelope({
        devices: [updated],
        selection: { id: "selection-1", attachmentId: updated.attachment.id },
      }),
    );

    expect(get(devices)).toEqual([updated]);
    expect(get(labState).getDraft.rpID).toBe("kept.example");
    expect(api.inspect).not.toHaveBeenCalled();
  });

  it("loads the active screen when a local opening state becomes ready", async () => {
    const device = testHIDDevice("token-1", "Token");

    seedDevicesForTest([device]);
    authenticatorSession.set({
      devices: [device],
      selectedAttachmentId: device.attachment.id,
      authenticator: { state: "opening" },
    });

    await handleDiscoveryChanged(
      envelope({
        devices: [device],
        selection: { id: "selection-1", attachmentId: device.attachment.id },
      }),
    );

    expect(api.inspect).toHaveBeenCalledOnce();
  });

  it("clears device state when the manager reopens the same attachment", async () => {
    const device = testHIDDevice("token-1", "Token");

    seedDevicesForTest([device]);
    seedSelectionForTest(device.attachment.id, device, {
      state: "ready",
      selectionId: "selection-1",
    });
    labState.update((state) => ({
      ...state,
      getDraft: { ...state.getDraft, rpID: "discard.example" },
    }));

    await handleDiscoveryChanged(
      envelope({
        devices: [device],
        selection: { id: "selection-2", attachmentId: device.attachment.id },
      }),
    );

    expect(get(labState).getDraft.rpID).toBe("example.com");
  });

  it("keeps smart-card recovery on the frontend", async () => {
    const original = testSmartCardDevice("card-1");
    const replacement = testSmartCardDevice("card-2");
    const hid = testHIDDevice("token-1", "HID");

    seedDevicesForTest([original]);
    seedSelectionForTest(original.attachment.id, original, {
      state: "ready",
      selectionId: "selection-1",
    });
    void offerOperationRecovery("Make credential", failureForCode(Code.CodeUserPresenceRequired));
    vi.spyOn(api, "setSelection").mockResolvedValue(undefined);

    await handleDiscoveryChanged(
      envelope({
        devices: [hid, replacement],
        selection: { id: "selection-2", attachmentId: hid.attachment.id },
      }),
    );

    expect(api.setSelection).toHaveBeenCalledWith({ attachmentId: replacement.attachment.id });
    expect(get(selectedSelector)).toBe(hid.attachment.id);

    await handleDiscoveryChanged(
      envelope({
        devices: [hid, replacement],
        selection: { id: "selection-3", attachmentId: replacement.attachment.id },
      }),
    );

    expect(get(selectedSelector)).toBe(replacement.attachment.id);
    expect(get(operationRecovery)?.canRetry).toBe(true);

    cancelOperationRecovery();
  });

  it("keeps a typed device-manager failure in the session", async () => {
    const error = failureForCode(Code.CodeTransportFailure);

    await handleDiscoveryChanged(envelope({ devices: [], error }));

    expect(get(authenticatorStatus)).toEqual({ state: "error", error });
  });

  it("keeps all devices visible when none can be opened", async () => {
    const device = testHIDDevice("token-1", "Unavailable token");
    const error = failureForCode(Code.CodeTransportFailure);

    await handleDiscoveryChanged(envelope({ devices: [device], error }));

    expect(get(devices)).toEqual([device]);
    expect(get(selectedSelector)).toBe("");
    expect(get(authenticatorStatus)).toEqual({ state: "error", error });
  });

  it("restores the generated session after a bridge failure", async () => {
    const first = testHIDDevice("token-1", "First");
    const second = testHIDDevice("token-2", "Second");

    seedDevicesForTest([first, second]);
    seedSelectionForTest(first.attachment.id, first, {
      state: "ready",
      selectionId: "selection-1",
    });
    vi.spyOn(api, "setSelection").mockRejectedValue(new Error("bridge unavailable"));

    await selectAuthenticatorSession(second.attachment.id);

    expect(get(selectedSelector)).toBe(first.attachment.id);
    expect(get(authenticatorStatus)).toEqual({
      state: "ready",
      selectionId: "selection-1",
    });
  });

  it("applies the manager fallback after a manual open failure", async () => {
    const first = testHIDDevice("token-1", "First");
    const second = testHIDDevice("token-2", "Second");
    const error = failureForCode(Code.CodeTransportFailure);

    seedDevicesForTest([first, second]);
    seedSelectionForTest(first.attachment.id, first, {
      state: "ready",
      selectionId: "selection-1",
    });
    vi.spyOn(api, "setSelection").mockResolvedValue(undefined);

    await selectAuthenticatorSession(second.attachment.id);

    expect(get(selectedSelector)).toBe(first.attachment.id);
    expect(get(authenticatorStatus)).toEqual({
      state: "ready",
      selectionId: "selection-1",
    });

    await handleDiscoveryChanged(
      envelope({
        devices: [first, second],
        selection: { id: "selection-2", attachmentId: first.attachment.id },
        error,
      }),
    );

    expect(get(selectedSelector)).toBe(first.attachment.id);
    expect(get(authenticatorStatus)).toEqual({
      state: "ready",
      selectionId: "selection-2",
    });
  });

  it("reports a manager error while retaining a ready fallback", async () => {
    const device = testHIDDevice("token-1", "Token");
    const error = failureForCode(Code.CodeTransportFailure);

    statusBar.update((state) => ({
      ...state,
      lastOutcome: { tone: "success", title: "Authenticator ready" },
    }));
    await handleDiscoveryChanged(
      envelope({
        devices: [device],
        selection: { id: "selection-1", attachmentId: device.attachment.id },
        error,
      }),
    );

    expect(get(authenticatorStatus)).toEqual({ state: "ready", selectionId: "selection-1" });
    expect(get(statusBar).lastOutcome?.tone).toBe("error");
  });

  it("recognizes smart-card attachments from the manager snapshot", () => {
    const card = testSmartCardDevice("card-1");

    expect(card.attachment.transport).toBe(Mode.ModeSmartCard);
  });
});
