import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import JsonEditor from "$lib/components/shared/JsonEditor.svelte";

describe("JsonEditor", () => {
  it("does not rewrite valid JSON when focus leaves the editor", async () => {
    const onChange = vi.fn();

    const { container } = render(JsonEditor, {
      props: {
        id: "payload",
        labelledBy: "payload-label",
        value: '{"enabled":true}',
        onChange,
      },
    });

    await waitFor(() => expect(container.querySelector(".cm-content")).toBeInTheDocument());
    await fireEvent.focusOut(container.querySelector(".cm-content")!, {
      relatedTarget: document.body,
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector(".cm-line")).toHaveTextContent('{"enabled":true}');
  });

  it("does not create line-number gutters", async () => {
    const { container } = render(JsonEditor, {
      props: {
        id: "payload",
        labelledBy: "payload-label",
        value: "{}",
        onChange: vi.fn(),
      },
    });

    await waitFor(() => expect(container.querySelector(".cm-editor")).toBeInTheDocument());

    expect(container.querySelector(".cm-gutters")).not.toBeInTheDocument();
  });
});
