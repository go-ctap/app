import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { labState } from "./features/lab/state";
import { activeScreen } from "./features/workbench/state";
import { resetAppStateForTest, seedSelectionForTest } from "./store-test-utils";
import { applyDiscovery, clearWorkbenchScreenCaches } from "./workbench-state";

const first = new DeviceReport({ fingerprint: "token-1", product: "First" });
const second = new DeviceReport({ fingerprint: "token-2", product: "Second" });

describe("WebAuthn Lab session lifecycle", () => {
  beforeEach(() => resetAppStateForTest());

  it("retains drafts and results while navigating on the same authenticator", () => {
    labState.update((state) => ({
      ...state,
      isCustom: true,
      makeDraft: { ...state.makeDraft, rpID: "kept.example" },
    }));

    activeScreen.set("lab");
    activeScreen.set("overview");
    activeScreen.set("lab");

    expect(get(labState).makeDraft.rpID).toBe("kept.example");
    expect(get(labState).isCustom).toBe(true);
  });

  it("resets all Lab state at the shared per-device cache boundary", () => {
    labState.update((state) => ({
      ...state,
      isCustom: true,
      makeDraft: { ...state.makeDraft, rpID: "discard.example" },
    }));

    clearWorkbenchScreenCaches();

    expect(get(labState)).toMatchObject({
      presetID: "discoverable",
      isCustom: false,
      pendingPresetID: null,
      pendingHandoff: null,
      makeStep: { phase: "editing" },
      getStep: { phase: "editing" },
      makeDraft: { rpID: "example.com" },
      getDraft: { rpID: "example.com" },
    });
  });

  it("preserves state for the same selector and clears it when selection changes", () => {
    seedSelectionForTest("token-1", first, { state: "ready", sessionId: "session-1" });
    labState.update((state) => ({
      ...state,
      isCustom: true,
      getDraft: { ...state.getDraft, rpID: "kept.example" },
    }));

    expect(applyDiscovery({
      devices: [first],
      selectedSelector: "token-1",
      selectedDevice: first,
      session: { state: "ready", sessionId: "session-1" },
    })).toBe(false);
    expect(get(labState).getDraft.rpID).toBe("kept.example");

    expect(applyDiscovery({
      devices: [first, second],
      selectedSelector: "token-2",
      selectedDevice: second,
      session: { state: "ready", sessionId: "session-2" },
    })).toBe(true);
    expect(get(labState).getDraft.rpID).toBe("example.com");
    expect(get(labState).isCustom).toBe(false);
  });
});
