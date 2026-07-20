import { cleanup, render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ExpandableDataTableTestFixture from "./ExpandableDataTableTestFixture.svelte";

describe("ExpandableDataTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps expansion controlled and renders the details row beside its summary", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const view = render(ExpandableDataTableTestFixture, {
      props: { open: false, onOpenChange },
    });

    const table = screen.getByRole("table", { name: "Credentials" });
    const trigger = within(table).getByRole("button", { name: "Toggle credential" });
    const summary = trigger.closest("tr") as HTMLTableRowElement;

    expect(table.closest('[data-slot="expandable-data-table-frame"]')).not.toBeNull();
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "credential-details");
    expect(trigger).toHaveAttribute("data-state", "closed");

    await user.click(trigger);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("credential-details")).toBeNull();

    await view.rerender({ open: true, onOpenChange });

    const details = summary.nextElementSibling as HTMLTableRowElement;
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("data-state", "open");
    expect(summary).toHaveAttribute("aria-selected", "true");
    expect(details).toHaveAttribute("id", "credential-details");
    expect(details.querySelector("td")).toHaveAttribute("colspan", "2");
    expect(within(details).getByText("Credential details")).toBeInTheDocument();

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("disables the trigger without requesting a state change", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(ExpandableDataTableTestFixture, {
      props: { open: false, disabled: true, onOpenChange },
    });

    const trigger = screen.getByRole("button", { name: "Toggle credential" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("data-disabled", "true");

    await user.click(trigger);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.getElementById("credential-details")).toBeNull();
  });
});
