import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { Nfc, Usb } from "@lucide/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppSidebar from "$lib/components/shell/AppSidebar.svelte";

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

    expect(
      screen.getAllByRole("button").map((button) => button.getAttribute("aria-label")),
    ).toEqual([
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
            {
              value: "token-1",
              label: "YubiKey 5 · ABC",
              name: "YubiKey 5",
              detail: "S/N ABC",
              icon: Usb,
            },
            {
              value: "token-2",
              label: "Token2 FIDO2 Card",
              name: "Token2 FIDO2 Card",
              detail: "ACS ACR1252 Dual Reader · PC/SC",
              icon: Nfc,
            },
          ],
        },
        onNavigate: vi.fn(),
        onSelectToken,
      },
    });

    expect(screen.getByRole("heading", { name: "Authenticators" })).toBeInTheDocument();

    const usbButton = screen.getByRole("button", { name: "YubiKey 5 · ABC" });
    const smartCardButton = screen.getByRole("button", { name: "Token2 FIDO2 Card" });

    expect(usbButton).toHaveAttribute("aria-pressed", "true");
    expect(usbButton.querySelector(".lucide-usb")).toBeInTheDocument();
    expect(smartCardButton.querySelector(".lucide-nfc")).toBeInTheDocument();
    expect(screen.getByText("YubiKey 5")).toHaveAttribute("title", "YubiKey 5");
    await user.click(smartCardButton);
    expect(onSelectToken).toHaveBeenCalledWith("token-2");
  });
});
