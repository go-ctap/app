import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAppLocale } from "$lib/i18n";

import JsonDisclosure from "./JsonDisclosure.svelte";

describe("JsonDisclosure", () => {
  const setText = vi.spyOn(Clipboard, "SetText");

  beforeEach(() => {
    setAppLocale("en");
    setText.mockReset();
    setText.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps sanitized copying independent from disclosure state", async () => {
    const user = userEvent.setup();

    render(JsonDisclosure, {
      props: {
        title: "Raw response",
        description: "ctapkit · Operation response",
        value: { pin: "123456", ok: true },
      },
    });

    const disclosure = screen.getByRole("button", { name: "Raw response" });
    const copy = screen.getByRole("button", { name: "Copy JSON" });

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("ctapkit · Operation response")).toBeInTheDocument();
    expect(screen.getByText(/"ok": true/)).not.toBeVisible();

    await user.click(copy);

    await waitFor(() => {
      expect(setText).toHaveBeenCalledWith(JSON.stringify({ pin: "[redacted]", ok: true }, null, 2));
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"ok": true/)).toBeVisible();
  });
});
