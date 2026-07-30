import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InventoryTrigger } from "../../bindings/github.com/go-ctap/kit";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  ActiveSelection,
  AuthenticatorSessionSnapshot,
  DiscoveryChangedEnvelope,
} from "../../bindings/telesma/service";

import { api } from "$lib/api.js";
import { handleDiscoveryChanged } from "$lib/discovery-controller.js";
import { authenticatorStatus, devices, selectedSelector } from "$lib/test-support/stores.js";
import { labState } from "$lib/features/lab/state.js";
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
import { testHIDDevice, testSmartCardDevice } from "../test/device.js";

function envelope(
  snapshot: AuthenticatorSessionSnapshot,
  trigger = InventoryTrigger.InventoryTriggerTopology,
): DiscoveryChangedEnvelope {
  return { trigger, snapshot };
}

describe("discovery controller", () => {
  beforeEach(() => {
    resetAppStateForTest();
    vi.restoreAllMocks();
  });

  it("applies the backend-owned session and resets per-device state once", async () => {
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

  it("updates identity without crossing an unchanged authenticator boundary", async () => {
    const original = testHIDDevice("token-1", "Original");
    const resolved = testHIDDevice("token-1", "Resolved");

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
      envelope(
        {
          devices: [resolved],
          selection: { id: "selection-1", attachmentId: resolved.attachment.id },
        },
        InventoryTrigger.InventoryTriggerIdentity,
      ),
    );

    expect(get(devices)).toEqual([resolved]);
    expect(get(labState).getDraft.rpID).toBe("kept.example");
  });

  it("clears device state when the backend reopens the same attachment", async () => {
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

  it("keeps smart-card recovery on the frontend and selects the replacement card", async () => {
    const original = testSmartCardDevice("card-1");
    const replacement = testSmartCardDevice("card-2");
    const hid = testHIDDevice("token-1", "HID");

    seedDevicesForTest([original]);
    seedSelectionForTest(original.attachment.id, original, {
      state: "ready",
      selectionId: "selection-1",
    });
    void offerOperationRecovery("Make credential", failureForCode(Code.CodeUserPresenceRequired));
    const selection = { id: "selection-3", attachmentId: replacement.attachment.id };

    vi.spyOn(api, "setSelection").mockResolvedValue({
      selection: selection as ActiveSelection,
    });

    await handleDiscoveryChanged(
      envelope({
        devices: [hid, replacement],
        selection: { id: "selection-2", attachmentId: hid.attachment.id },
      }),
    );

    expect(api.setSelection).toHaveBeenCalledWith({ attachmentId: replacement.attachment.id });
    expect(get(selectedSelector)).toBe(replacement.attachment.id);
    expect(get(operationRecovery)?.canRetry).toBe(true);

    cancelOperationRecovery();
  });

  it("keeps a typed discovery failure in the session", async () => {
    const error = failureForCode(Code.CodeTransportFailure);

    await handleDiscoveryChanged(envelope({ devices: [], error }));

    expect(get(authenticatorStatus)).toEqual({ state: "error", error });
  });
});
