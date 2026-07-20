import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setAppLocale } from "$lib/i18n";
import { setAdvancedMode } from "$lib/preferences";

import Settings from "./Settings.svelte";

describe("Settings", () => {
  beforeEach(() => {
    setAppLocale("en");
    setAdvancedMode(false);
  });

  afterEach(() => {
    cleanup();
    document.body.style.pointerEvents = "";
  });

  it("changes the app locale from the settings screen", async () => {
    const user = userEvent.setup();

    render(Settings);

    await user.click(screen.getByRole("button", { name: "Language" }));
    await user.click(screen.getByText("Russian"));

    expect(localStorage.getItem("fidoapp.locale")).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
  });

  it("persists Advanced Mode changes", async () => {
    const user = userEvent.setup();

    render(Settings);

    const advancedMode = screen.getByRole("switch", { name: "Advanced Mode" });
    expect(advancedMode).not.toBeChecked();

    await user.click(advancedMode);

    expect(advancedMode).toBeChecked();
    expect(localStorage.getItem("fidoapp.advancedMode")).toBe("true");
  });
});
