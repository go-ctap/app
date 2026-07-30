import { Browser } from "@wailsio/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setAppLocale } from "$lib/i18n";

import { openExternalLink } from "$lib/external-links";

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

describe("openExternalLink", () => {
  const openURL = vi.spyOn(Browser, "OpenURL");

  beforeEach(() => {
    setAppLocale("en");
    openURL.mockReset();
    toastMocks.error.mockClear();
  });

  it("prevents WebView navigation and delegates the URL to Wails", async () => {
    openURL.mockResolvedValue();

    const event = new MouseEvent("click", { cancelable: true });

    await expect(openExternalLink(event, "https://example.com/spec")).resolves.toBe(true);

    expect(event.defaultPrevented).toBe(true);
    expect(openURL).toHaveBeenCalledWith("https://example.com/spec");
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("reports a runtime failure without navigating the WebView", async () => {
    openURL.mockRejectedValue(new Error("browser unavailable"));

    const event = new MouseEvent("click", { cancelable: true });

    await expect(openExternalLink(event, "https://example.com/spec")).resolves.toBe(false);

    expect(event.defaultPrevented).toBe(true);
    expect(toastMocks.error).toHaveBeenCalledWith("Could not open link in your browser");
  });
});
