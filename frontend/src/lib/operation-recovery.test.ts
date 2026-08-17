import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { Category, Code, Failure } from "../../bindings/github.com/telesma-app/kit/model/failure";

import {
  resetAppStateForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils.js";
import { testHIDDevice, testSmartCardDevice } from "../test/device.js";
import {
  cancelOperationRecovery,
  isCardPresenceRecoveryCandidate,
  offerOperationRecovery,
  operationRecovery,
  retryOperationRecovery,
} from "$lib/operation-recovery.js";

function failure(code: Code) {
  return new Failure({
    code,
    category: Category.CategoryInvalidState,
  });
}

function seedReadyCard(id = "card-1", selectionId = `authenticator-${id}`) {
  const card = testSmartCardDevice(id);

  seedDevicesForTest([card]);
  seedSelectionForTest(id, card, { state: "ready", selectionId });

  return card;
}

describe("operation recovery", () => {
  beforeEach(resetAppStateForTest);

  it.each([
    Code.CodeUserPresenceRequired,
    Code.CodeCredentialCreationDenied,
    Code.CodeAssertionDenied,
    Code.CodeAuthenticatorOperationDenied,
    Code.CodeCTAPOtherError,
  ])("accepts normalized card-presence failure %s", (code) => {
    expect(isCardPresenceRecoveryCandidate(failure(code))).toBe(true);
  });

  it.each([Code.CodePINInvalid, Code.CodeOperationUnsupported, Code.CodeTransportFailure])(
    "rejects unrelated failure %s",
    (code) => {
      expect(isCardPresenceRecoveryCandidate(failure(code))).toBe(false);
    },
  );

  it("requires removal and an explicitly ready reattachment before retry", async () => {
    seedReadyCard();

    const decision = offerOperationRecovery(
      "Create credential",
      failure(Code.CodeUserPresenceRequired),
    );

    expect(decision).not.toBeNull();
    expect(get(operationRecovery)).toMatchObject({
      label: "Create credential",
      mustRemove: true,
      cardVisible: true,
      canRetry: false,
    });

    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    expect(get(operationRecovery)).toMatchObject({
      mustRemove: false,
      cardVisible: false,
      opening: false,
      canRetry: false,
    });

    const reattached = testSmartCardDevice("card-2");

    seedDevicesForTest([reattached]);
    expect(get(operationRecovery)).toMatchObject({
      cardVisible: true,
      opening: true,
      canRetry: false,
    });

    seedSelectionForTest("card-2", reattached, {
      state: "ready",
      selectionId: "authenticator-card-2",
    });
    expect(get(operationRecovery)).toMatchObject({
      opening: false,
      canRetry: true,
    });
    expect(retryOperationRecovery()).toBe(true);
    await expect(decision).resolves.toBe("retry");
    expect(get(operationRecovery)).toBeNull();
  });

  it("does not offer recovery for a HID authenticator and resolves cancel explicitly", async () => {
    const hid = testHIDDevice();

    seedDevicesForTest([hid]);
    seedSelectionForTest(hid.attachment.id, hid, {
      state: "ready",
      selectionId: "authenticator-hid",
    });
    expect(offerOperationRecovery("Inspect", failure(Code.CodeUserPresenceRequired))).toBeNull();

    seedReadyCard();

    const decision = offerOperationRecovery("Inspect", failure(Code.CodeUserPresenceRequired));

    cancelOperationRecovery();
    await expect(decision).resolves.toBe("cancel");
  });
});
