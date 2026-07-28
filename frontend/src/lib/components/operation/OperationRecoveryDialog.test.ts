import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Code } from "../../../../bindings/github.com/go-ctap/kit/model/failure";

import { setAppLocale } from "$lib/i18n.js";
import { failureForCode } from "$lib/test-failure.js";

import OperationRecoveryDialog from "./OperationRecoveryDialog.svelte";

function presentation(overrides: Record<string, boolean> = {}) {
  return {
    label: "Create credential",
    failure: failureForCode(Code.CodeUserPresenceRequired),
    mustRemove: true,
    cardVisible: true,
    wrongDevice: false,
    opening: false,
    canRetry: false,
    ...overrides,
  };
}

describe("OperationRecoveryDialog", () => {
  beforeEach(() => setAppLocale("en"));
  afterEach(cleanup);

  it("shows the operation and keeps retry disabled until reattachment is ready", async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn(() => true);
    const view = render(OperationRecoveryDialog, {
      props: {
        presentation: presentation(),
        onCancel,
        onRetry,
      },
    });

    expect(screen.getByRole("heading", { name: "Reattach smart card" })).toBeInTheDocument();
    expect(screen.getByText(/Create credential ended with an authenticator response error/)).toBeInTheDocument();
    expect(screen.getByText("Remove the smart card from the reader.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();

    await view.rerender({
      presentation: presentation({
        mustRemove: false,
        opening: false,
        canRetry: true,
      }),
      onCancel,
      onRetry,
    });
    expect(screen.getByText("The reattached smart card is ready.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("renders inventory-visible but unready cards as opening and exposes cancel", async () => {
    const onCancel = vi.fn();
    render(OperationRecoveryDialog, {
      props: {
        presentation: presentation({
          mustRemove: false,
          opening: true,
        }),
        onCancel,
        onRetry: vi.fn(() => true),
      },
    });

    expect(screen.getByText("Opening the smart card…")).toBeInTheDocument();
    expect(screen.queryByText("Present the smart card again.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
