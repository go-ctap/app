import { Clipboard } from "@wailsio/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setAppLocale } from "$lib/i18n";

import { copyToClipboard } from "$lib/clipboard";

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

describe("copyToClipboard", () => {
  const setText = vi.spyOn(Clipboard, "SetText");

  beforeEach(() => {
    setAppLocale("en");
    setText.mockReset();
    toastMocks.error.mockClear();
    toastMocks.success.mockClear();
  });

  it("shows success only after Wails writes to the clipboard", async () => {
    setText.mockResolvedValue();

    await expect(copyToClipboard("value", "Value copied")).resolves.toBe(true);

    expect(setText).toHaveBeenCalledWith("value");
    expect(toastMocks.success).toHaveBeenCalledWith("Value copied");
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("shows an error instead of a false success when Wails rejects the write", async () => {
    setText.mockRejectedValue(new Error("clipboard unavailable"));

    await expect(copyToClipboard("value", "Value copied")).resolves.toBe(false);

    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith("Could not copy to clipboard");
  });
});
