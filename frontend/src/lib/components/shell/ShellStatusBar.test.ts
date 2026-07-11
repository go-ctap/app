import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShellStatusPresentation } from "$lib/shell-presentation";

import ShellStatusBar from "./ShellStatusBar.svelte";

function presentation(patch: Partial<ShellStatusPresentation> = {}): ShellStatusPresentation {
  return {
    source: "idle",
    tone: "neutral",
    title: "Ready",
    detail: "Test key",
    busy: false,
    progress: null,
    cancel: null,
    retry: null,
    ...patch,
  };
}

describe("ShellStatusBar", () => {
  afterEach(cleanup);

  it("renders determinate progress and requests cancellation", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(ShellStatusBar, {
      props: {
        presentation: presentation({
          source: "operation",
          tone: "info",
          title: "Credential inventory",
          detail: "Reading credentials",
          busy: true,
          progress: { value: 2, max: 5, label: "2 of 5", ariaLabel: "Operation progress" },
          cancel: { label: "Cancel", ariaLabel: "Cancel operation", disabled: false },
        }),
        onCancel,
        onRetry: vi.fn(),
      },
    });

    expect(screen.getByRole("progressbar", { name: "Operation progress" })).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel operation" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders retry for a retryable outcome", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(ShellStatusBar, {
      props: {
        presentation: presentation({
          source: "outcome",
          tone: "error",
          title: "Operation failed",
          retry: { label: "Retry", ariaLabel: "Retry", disabled: false },
        }),
        onCancel: vi.fn(),
        onRetry,
      },
    });

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
