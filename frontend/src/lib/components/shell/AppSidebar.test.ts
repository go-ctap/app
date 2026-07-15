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
          activeScreenLabel: "Overview",
          tokens: [],
          selectedValue: "",
          busy: false,
        },
        onNavigate,
        onSelectToken: vi.fn(),
      },
    });

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Overview",
      "Passkeys",
      "Large blobs",
      "Security",
      "WebAuthn Lab",
      "Logs",
      "Settings",
    ]);

    await user.click(screen.getByRole("button", { name: "Passkeys" }));
    await user.click(screen.getByRole("button", { name: "WebAuthn Lab" }));
    await user.click(screen.getByRole("button", { name: "Large blobs" }));
    await user.click(screen.getByRole("button", { name: "Security" }));
    await user.click(screen.getByRole("button", { name: "Logs" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onNavigate).toHaveBeenCalledWith("passkeys");
    expect(onNavigate).toHaveBeenCalledWith("lab");
    expect(onNavigate).toHaveBeenCalledWith("large-blobs");
    expect(onNavigate).toHaveBeenCalledWith("security");
    expect(onNavigate).toHaveBeenCalledWith("logs");
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });

  it("reserves native titlebar space above the brand on macOS", () => {
    const { container } = render(AppSidebar, {
      props: {
        presentation: {
          activeScreen: "overview",
          activeScreenLabel: "Overview",
          tokens: [],
          selectedValue: "",
          busy: false,
        },
        nativeWindowTitlebar: true,
        onNavigate: vi.fn(),
        onSelectToken: vi.fn(),
      },
    });

    const sidebar = container.querySelector(".app-sidebar");
    expect(sidebar).toHaveAttribute("data-native-titlebar", "true");
    expect(sidebar?.firstElementChild).toHaveClass("sidebar-titlebar-space");
    expect(sidebar?.children[1]).toHaveClass("sidebar-brand");
  });

  it("selects a discovered token from the persistent token section", async () => {
    const user = userEvent.setup();
    const onSelectToken = vi.fn();

    render(AppSidebar, {
      props: {
        presentation: {
          activeScreen: "overview",
          activeScreenLabel: "Overview",
          selectedValue: "token-1",
          busy: false,
          tokens: [
            { value: "token-1", label: "YubiKey 5 · ABC", name: "YubiKey 5", detail: "S/N ABC" },
            { value: "token-2", label: "SoloKey · DEF", name: "SoloKey", detail: "S/N DEF" },
          ],
        },
        onNavigate: vi.fn(),
        onSelectToken,
      },
    });

    expect(screen.getByRole("heading", { name: "Tokens" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "YubiKey 5 · ABC" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("YubiKey 5")).toHaveAttribute("title", "YubiKey 5");
    await user.click(screen.getByRole("button", { name: "SoloKey · DEF" }));
    expect(onSelectToken).toHaveBeenCalledWith("token-2");
  });
});
