import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InteractionKind, InteractionRequest } from "../../../../bindings/github.com/go-ctap/kit/model";
import { InteractionAnswer, InteractionPrompt } from "../../../../bindings/github.com/go-ctap/kit/service";

import { buildInteractionModalPresentation } from "$lib/shell-presentation";
import { resetAppStateForTest } from "$lib/store-test-utils";

import InteractionModal from "./InteractionModal.svelte";

function pinPrompt(interactionId = "interaction-1") {
  return new InteractionPrompt({
    interactionId,
    operationId: "operation-1",
    sessionId: "session-1",
    request: new InteractionRequest({
      kind: InteractionKind.InteractionKindPIN,
      message: "Enter PIN",
      preview: {
        pinUvAuthToken: "secret-token",
        options: { pinUvAuthToken: true },
      },
    }),
  });
}

describe("InteractionModal", () => {
  let onAnswer = vi.fn(async () => {});

  beforeEach(() => {
    onAnswer = vi.fn(async () => {});
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
  });

  it("focuses the PIN input when a PIN prompt opens", async () => {
    render(InteractionModal, {
      props: { presentation: buildInteractionModalPresentation(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("submits the PIN prompt from Enter without rendering preview secrets", async () => {
    const user = userEvent.setup();
    render(InteractionModal, {
      props: { presentation: buildInteractionModalPresentation(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456{Enter}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(new InteractionAnswer({
      interactionId: "interaction-1",
      pin: "123456",
      confirmed: true,
      canceled: false,
    }));
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "PRE" && element.textContent?.includes('"pinUvAuthToken": "[redacted]"'))).toBeInTheDocument();
  });

  it("does not submit an empty PIN", async () => {
    render(InteractionModal, {
      props: { presentation: buildInteractionModalPresentation(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    expect(screen.getByRole("button", { name: "Send PIN" })).toBeDisabled();
    await fireEvent.submit(input.closest("form")!);

    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("cancels the prompt from Escape", async () => {
    const user = userEvent.setup();
    render(InteractionModal, {
      props: { presentation: buildInteractionModalPresentation(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456");
    await user.keyboard("{Escape}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(new InteractionAnswer({
      interactionId: "interaction-1",
      confirmed: false,
      canceled: true,
    }));
  });

  it("does not carry a PIN into the next prompt after an external dismissal", async () => {
    const user = userEvent.setup();
    const view = render(InteractionModal, {
      props: { presentation: buildInteractionModalPresentation(pinPrompt()), onAnswer },
    });

    await user.type(await screen.findByLabelText("PIN"), "123456");
    await view.rerender({ presentation: null, onAnswer });
    await view.rerender({
      presentation: buildInteractionModalPresentation(pinPrompt("interaction-2")),
      onAnswer,
    });

    expect(await screen.findByLabelText("PIN")).toHaveValue("");
  });
});
