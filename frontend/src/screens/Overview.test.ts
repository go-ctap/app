import { cleanup, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAppLocale } from "$lib/i18n";
import {
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSLoading,
  overviewMDSLookup,
  selectedDevice,
  selectedSelector,
  sessionStatus,
} from "$lib/stores";
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
    selectedSelector.set("");
    selectedDevice.set(null);
    sessionStatus.set({ state: "idle", selectedSelector: "", selectedDevice: null });
    overviewEnvelope.set(null);
    overviewBioSensorEnvelope.set(null);
    overviewMDSLookup.set(null);
    overviewLoading.set(false);
    overviewMDSLoading.set(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the overview when returning with an existing selected session", async () => {
    selectedSelector.set("token-1");
    sessionStatus.set({
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });

    render(Overview);

    await waitFor(() => expect(controllerMocks.loadOverview).toHaveBeenCalledWith("token-1"));
  });
});
