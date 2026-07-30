import { cleanup, render, screen, within } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setAppLocale } from "$lib/i18n";

import NoAuthenticatorState from "$lib/components/shell/NoAuthenticatorState.svelte";

describe("NoAuthenticatorState", () => {
  beforeEach(() => {
    setAppLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("explains automatic discovery and preserves the current screen context", () => {
    render(NoAuthenticatorState, { props: { screenLabel: "Passkeys" } });

    expect(screen.getByRole("heading", { name: "Connect an authenticator" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "No manual setup is needed. Telesma is already watching for a compatible local authenticator.",
      ),
    ).toBeInTheDocument();

    const steps = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(within(steps[1]).getByText("The first device opens automatically")).toBeInTheDocument();
    expect(within(steps[2]).getByText("Passkeys will appear here")).toBeInTheDocument();
    expect(screen.getByText("Watching for authenticators")).toBeInTheDocument();
  });
});
