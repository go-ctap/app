import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppSidebar from "./AppSidebar.svelte";

describe("AppSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("switches screens from the live navigation", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(AppSidebar, {
      props: {
        presentation: {
          activeScreen: "overview",
          status: {
            stateLabel: "Idle",
            title: "Idle",
            detail: "No token selected",
          },
        },
        onNavigate,
      },
    });

    await user.click(screen.getByRole("button", { name: "Passkeys" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onNavigate).toHaveBeenCalledWith("passkeys");
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });
});
