import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DetailNavigation from "$lib/components/shared/DetailNavigation.svelte";
import { detectWindowPlatform, windowPlatform } from "$lib/window-platform";

function props(values: { shortcutsEnabled?: boolean; canNext?: boolean } = {}) {
  return {
    navigationLabel: "Item navigation",
    positionLabel: "Item 2 of 3",
    previousLabel: "Previous item",
    nextLabel: "Next item",
    canPrevious: true,
    canNext: values.canNext ?? true,
    shortcutsEnabled: values.shortcutsEnabled ?? true,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };
}

describe("DetailNavigation", () => {
  beforeEach(() => windowPlatform.set("windows"));

  afterEach(() => {
    cleanup();
    windowPlatform.set(detectWindowPlatform());
  });

  it("shares button and Alt+Arrow navigation semantics", async () => {
    const user = userEvent.setup();
    const navigation = props();

    render(DetailNavigation, { props: navigation });

    const previous = screen.getByRole("button", { name: "Previous item" });
    const next = screen.getByRole("button", { name: "Next item" });

    expect(screen.getByRole("navigation", { name: "Item navigation" })).toBeInTheDocument();
    expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
    expect(previous).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp");
    expect(next).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowDown");

    await user.hover(previous);
    expect(await screen.findByText("Alt")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();

    await user.click(previous);
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    expect(navigation.onPrevious).toHaveBeenCalledTimes(2);
    expect(navigation.onNext).toHaveBeenCalledOnce();

    const input = document.createElement("input");

    document.body.append(input);
    input.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    input.remove();

    expect(navigation.onNext).toHaveBeenCalledOnce();
  });

  it("does not handle disabled navigation or inactive shortcuts", async () => {
    const user = userEvent.setup();
    const navigation = props({ shortcutsEnabled: false, canNext: false });

    render(DetailNavigation, { props: navigation });

    expect(screen.getByRole("button", { name: "Next item" })).toBeDisabled();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    expect(navigation.onPrevious).not.toHaveBeenCalled();
    expect(navigation.onNext).not.toHaveBeenCalled();
  });

  it("uses the native Option symbol on macOS", async () => {
    const user = userEvent.setup();

    windowPlatform.set("macos");
    render(DetailNavigation, { props: props() });

    const previous = screen.getByRole("button", { name: "Previous item" });

    expect(previous).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp");
    await user.hover(previous);
    expect(await screen.findByText("⌥")).toBeInTheDocument();
    expect(screen.queryByText("Alt")).not.toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });
});
