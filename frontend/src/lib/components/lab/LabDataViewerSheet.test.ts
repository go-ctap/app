import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LabDataViewerSheet from "$lib/components/lab/LabDataViewerSheet.svelte";

describe("LabDataViewerSheet", () => {
  const setText = vi.spyOn(Clipboard, "SetText");

  beforeEach(() => {
    setText.mockReset();
    setText.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it("presents and copies sanitized JSON from the document toolbar", async () => {
    const user = userEvent.setup();

    render(LabDataViewerSheet, {
      props: {
        open: true,
        title: "Request JSON",
        description: "Normalized request",
        kind: "json",
        value: { pin: "123456", challenge: "public-value" },
      },
    });

    expect(screen.getByRole("dialog", { name: "Request JSON" })).toBeInTheDocument();
    expect(screen.getByText("Normalized request")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();

    const region = screen.getByRole("region", { name: "Request JSON" });

    await waitFor(() => expect(region.querySelector("pre.shiki")).toBeInTheDocument());
    expect(region).toHaveTextContent('"pin": "[redacted]"');
    expect(region).not.toHaveTextContent("123456");

    await user.click(screen.getByRole("button", { name: "Copy Request JSON" }));

    await waitFor(() =>
      expect(setText).toHaveBeenCalledWith(
        JSON.stringify({ pin: "[redacted]", challenge: "public-value" }, null, 2),
      ),
    );
  });

  it("shows hex metadata without adding a clipboard action", () => {
    render(LabDataViewerSheet, {
      props: {
        open: true,
        title: "Binary request",
        kind: "hex",
        value: "aabb",
        byteCount: 2,
      },
    });

    expect(screen.getAllByText("Hex · 2 bytes")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Binary request" })).toHaveTextContent("aabb");
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument();
  });
});
