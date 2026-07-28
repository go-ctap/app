import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { testHIDDevice } from "../test/device.js";

import { labState } from "./features/lab/state";
import { activeScreen } from "./features/workbench/state";
import { resetAppStateForTest, seedSelectionForTest } from "./store-test-utils";
import { applyDiscovery, clearWorkbenchScreenCaches } from "./workbench-state";

const first = testHIDDevice("token-1", "First");
const second = testHIDDevice("token-2", "Second");

describe("WebAuthn Lab authenticator lifecycle", () => {
  beforeEach(() => resetAppStateForTest());

  it("retains drafts and results while navigating on the same authenticator", () => {
    labState.update((state) => ({
      ...state,
      makeDraft: { ...state.makeDraft, rpID: "kept.example" },
    }));

    activeScreen.set("lab");
    activeScreen.set("overview");
    activeScreen.set("lab");

    expect(get(labState).makeDraft.rpID).toBe("kept.example");
  });

  it("resets all Lab state at the shared per-device cache boundary", () => {
    labState.update((state) => ({
      ...state,
      makeDraft: { ...state.makeDraft, rpID: "discard.example" },
    }));

    clearWorkbenchScreenCaches();

    expect(get(labState)).toMatchObject({
      pendingHandoff: null,
      makeStep: { phase: "editing" },
      getStep: { phase: "editing" },
      makeVerification: { phase: "idle" },
      makeAttestationTrust: { phase: "idle" },
      getVerification: { phase: "idle" },
      makeDraft: { rpID: "example.com" },
      getDraft: { rpID: "example.com" },
    });
  });

  it("preserves state for the same selector and clears it when selection changes", () => {
    seedSelectionForTest("token-1", first, { state: "ready", selectionId: "authenticator-1" });
    labState.update((state) => ({
      ...state,
      getDraft: { ...state.getDraft, rpID: "kept.example" },
    }));

    expect(applyDiscovery({
      devices: [first],
      selectedSelector: "token-1",
      selectedDevice: first,
      authenticator: { state: "ready", selectionId: "authenticator-1" },
    })).toBe(false);
    expect(get(labState).getDraft.rpID).toBe("kept.example");

    expect(applyDiscovery({
      devices: [first, second],
      selectedSelector: "token-2",
      selectedDevice: second,
      authenticator: { state: "ready", selectionId: "authenticator-2" },
    })).toBe(true);
    expect(get(labState).getDraft.rpID).toBe("example.com");
  });
});
