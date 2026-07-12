import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PINStatus,
  RetryState,
  StateValue,
} from "../../../../bindings/github.com/go-ctap/kit/model/config";

import { setAppLocale } from "$lib/i18n";

import SecurityPIN from "./SecurityPIN.svelte";

function unsetPIN() {
  return new PINStatus({
    state: StateValue.StateNotConfigured,
    supported: true,
    configured: false,
    protocolSupported: true,
    minPINLength: 4,
    maxPINLength: 63,
    retries: new RetryState({ state: StateValue.StateUnknown }),
  });
}

describe("SecurityPIN", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("clears local PIN fields before the operation settles", async () => {
    const user = userEvent.setup();
    let finishOperation!: (result: boolean) => void;
    const onSetPIN = vi.fn(() => new Promise<boolean>((resolve) => {
      finishOperation = resolve;
    }));

    render(SecurityPIN, {
      props: {
        pin: unsetPIN(),
        disabled: false,
        onSetPIN,
        onChangePIN: vi.fn(async () => true),
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));
    await user.type(screen.getByLabelText("New PIN"), "123456");
    await user.type(screen.getByLabelText("Confirm new PIN"), "123456");
    await fireEvent.click(screen.getAllByRole("button", { name: "Set PIN" })[1]);

    expect(onSetPIN).toHaveBeenCalledWith({ newPIN: "123456" });
    expect(screen.queryByLabelText("New PIN")).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));
    expect(screen.getByLabelText("New PIN")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new PIN")).toHaveValue("");

    finishOperation(true);
  });

  it("clears PIN fields when the dialog closes", async () => {
    const user = userEvent.setup();

    render(SecurityPIN, {
      props: {
        pin: unsetPIN(),
        disabled: false,
        onSetPIN: vi.fn(async () => true),
        onChangePIN: vi.fn(async () => true),
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));
    await user.type(screen.getByLabelText("New PIN"), "123456");
    await user.type(screen.getByLabelText("Confirm new PIN"), "123456");
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));

    expect(screen.getByLabelText("New PIN")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new PIN")).toHaveValue("");
  });

  it("clears secrets on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();

    render(SecurityPIN, {
      props: {
        pin: unsetPIN(),
        disabled: false,
        onSetPIN: vi.fn(async () => false),
        onChangePIN: vi.fn(async () => false),
      },
    });

    const trigger = screen.getByRole("button", { name: "Set PIN" });
    await fireEvent.click(trigger);
    await user.type(screen.getByLabelText("New PIN"), "escape-secret");
    await user.type(screen.getByLabelText("Confirm new PIN"), "escape-secret");
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("New PIN")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await fireEvent.click(trigger);
    expect(screen.getByLabelText("New PIN")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new PIN")).toHaveValue("");
  });
});
