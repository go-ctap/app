import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthenticatorTitlebarControl from "./AuthenticatorTitlebarControl.svelte";

describe("AuthenticatorTitlebarControl", () => {
  afterEach(() => {
    cleanup();
  });

  it("emits refresh and clear callbacks from the titlebar controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClear = vi.fn();
    const onRefresh = vi.fn();

    render(AuthenticatorTitlebarControl, {
      props: {
        model: {
          items: [{ value: "token-1", label: "Token 1", name: "Token 1", detail: "hid - token-1" }],
          selectedValue: "token-1",
          selectedLabel: "Token 1",
          busy: false,
          clearDisabled: false,
        },
        onSelect,
        onClear,
        onRefresh,
      },
    });

    await user.click(screen.getByRole("button", { name: "Refresh devices" }));
    await user.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
