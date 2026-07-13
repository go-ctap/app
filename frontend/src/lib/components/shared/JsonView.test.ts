import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import JsonView from "./JsonView.svelte";

describe("JsonView", () => {
  const setText = vi.spyOn(Clipboard, "SetText");

  beforeEach(() => {
    setText.mockReset();
    setText.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders and copies sanitized JSON", async () => {
    render(JsonView, {
      props: {
        value: {
          pin: "123456",
          encIdentifier: "00112233445566778899aabbccddeeff",
          encCredStoreState: "ffeeddccbbaa99887766554433221100",
          options: { pinUvAuthToken: true },
        },
      },
    });

    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText(/0011223344556677/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ffeeddccbbaa9988/)).not.toBeInTheDocument();
    expect(screen.getByText(/"pin": "\[redacted\]"/)).toBeInTheDocument();
    expect(screen.getByText(/"encIdentifier": "\[redacted\]"/)).toBeInTheDocument();
    expect(screen.getByText(/"encCredStoreState": "\[redacted\]"/)).toBeInTheDocument();
    expect(screen.getByText(/"pinUvAuthToken": true/)).toBeInTheDocument();

    screen.getByRole("button", { name: "Copy" }).click();

    await waitFor(() => expect(setText).toHaveBeenCalledWith(JSON.stringify({
      pin: "[redacted]",
      encIdentifier: "[redacted]",
      encCredStoreState: "[redacted]",
      options: { pinUvAuthToken: true },
    }, null, 2)));
  });
});
