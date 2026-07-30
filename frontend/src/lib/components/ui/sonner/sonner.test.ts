import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { toast } from "svelte-sonner";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import SonnerDialogTest from "$lib/test-support/components/SonnerDialogFixture.svelte";

describe("Sonner", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  });

  afterEach(() => {
    cleanup();
    toast.dismiss();
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";
  });

  it("keeps toast controls interactive while a dialog locks the page", async () => {
    const user = userEvent.setup();

    render(SonnerDialogTest);
    toast("Saved");

    await waitFor(() => expect(document.body).toHaveStyle({ pointerEvents: "none" }));
    await user.click(await screen.findByRole("button", { name: "Close toast" }));

    await waitFor(() => expect(screen.queryByText("Saved")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Test dialog" })).toBeInTheDocument();
  });
});
