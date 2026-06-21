import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAppLocale } from "$lib/i18n";
import Settings from "./Settings.svelte";

describe("Settings", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("changes the app locale from the settings screen", async () => {
    const user = userEvent.setup();

    render(Settings);

    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "ru");

    expect(localStorage.getItem("fidoapp.locale")).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
  });
});
