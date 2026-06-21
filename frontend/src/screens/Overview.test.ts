import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAppLocale } from "$lib/i18n";
import {
  selectedSelector,
  sessionStatus,
} from "$lib/app-state";
import { resetAppStateForTest } from "$lib/store-test-utils";
import Overview from "./Overview.svelte";

const controllerMocks = vi.hoisted(() => ({
  loadOverview: vi.fn(() => Promise.resolve()),
  loadOverviewMDS: vi.fn(() => Promise.resolve()),
}));

vi.mock("$lib/controller", () => ({
  loadOverview: controllerMocks.loadOverview,
  loadOverviewMDS: controllerMocks.loadOverviewMDS,
}));

describe("Overview", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.loadOverview.mockClear();
    controllerMocks.loadOverviewMDS.mockClear();
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not own overview autoload lifecycle", () => {
    selectedSelector.set("token-1");
    sessionStatus.set({
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });

    render(Overview);

    expect(controllerMocks.loadOverview).not.toHaveBeenCalled();
  });
});
