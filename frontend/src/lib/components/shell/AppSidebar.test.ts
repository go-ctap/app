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
        },
        onNavigate,
      },
    });

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Overview",
      "Passkeys",
      "Large blobs",
      "Security",
      "Settings",
    ]);

    await user.click(screen.getByRole("button", { name: "Passkeys" }));
    await user.click(screen.getByRole("button", { name: "Large blobs" }));
    await user.click(screen.getByRole("button", { name: "Security" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onNavigate).toHaveBeenCalledWith("passkeys");
    expect(onNavigate).toHaveBeenCalledWith("large-blobs");
    expect(onNavigate).toHaveBeenCalledWith("security");
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });

  it("reserves native titlebar space above the brand on macOS", () => {
    const { container } = render(AppSidebar, {
      props: {
        presentation: {
          activeScreen: "overview",
        },
        nativeWindowTitlebar: true,
        onNavigate: vi.fn(),
      },
    });

    const sidebar = container.querySelector(".app-sidebar");
    expect(sidebar).toHaveAttribute("data-native-titlebar", "true");
    expect(sidebar?.firstElementChild).toHaveClass("sidebar-titlebar-space");
    expect(sidebar?.children[1]).toHaveClass("sidebar-brand");
  });
});
