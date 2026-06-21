import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JsonView from "./JsonView.svelte";

describe("JsonView", () => {
  const writeText = vi.fn(async () => {});

  beforeEach(() => {
    writeText.mockClear();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify({
      pin: "[redacted]",
      options: { pinUvAuthToken: true },
    }, null, 2)));
  });
});
