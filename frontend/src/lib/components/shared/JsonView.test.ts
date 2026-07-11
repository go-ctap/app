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
          options: { pinUvAuthToken: true },
        },
      },
    });

    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.getByText(/"pin": "\[redacted\]"/)).toBeInTheDocument();
    expect(screen.getByText(/"pinUvAuthToken": true/)).toBeInTheDocument();

    screen.getByRole("button", { name: "Copy" }).click();

    await waitFor(() => expect(setText).toHaveBeenCalledWith(JSON.stringify({
      pin: "[redacted]",
      options: { pinUvAuthToken: true },
    }, null, 2)));
  });
});
