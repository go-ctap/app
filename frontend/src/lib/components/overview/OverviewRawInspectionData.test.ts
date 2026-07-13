import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAppLocale } from "$lib/i18n";

import OverviewRawInspectionData from "./OverviewRawInspectionData.svelte";

describe("OverviewRawInspectionData", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps copying independent from the disclosure trigger", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(OverviewRawInspectionData, { props: { result: null, onCopy } });

    const disclosure = screen.getByRole("button", { name: "Raw inspection data" });
    const copy = screen.getByRole("button", { name: "Copy JSON" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveTextContent("ctapkit · Raw operation response");
    expect(screen.getByText("null")).not.toBeVisible();

    await user.click(copy);

    expect(onCopy).toHaveBeenCalledOnce();
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("null")).toBeVisible();
  });
});
