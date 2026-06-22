import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAppLocale } from "$lib/i18n";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { resetAppStateForTest, seedOverviewMDSForTest, seedSelectionForTest } from "$lib/store-test-utils";
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
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });

    render(Overview);

    expect(controllerMocks.loadOverview).not.toHaveBeenCalled();
  });

  it("renders degraded Overview warnings without owning global errors", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedOverviewMDSForTest({ error: new RuntimeErrorEnvelope({ message: "MDS offline" }) });

    render(Overview);

    expect(screen.getByRole("status")).toHaveTextContent("MDS offline");
  });
});
