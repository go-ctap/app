import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractionKind, InteractionRequest } from "../../bindings/github.com/go-ctap/kit/model";
import { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import { resetAppStateForTest } from "$lib/store-test-utils";
import { buildInteractionModalModel } from "$lib/shell-view-model";
import InteractionModal from "./InteractionModal.svelte";

function pinPrompt() {
  return new InteractionPrompt({
    interactionId: "interaction-1",
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
  let onAnswer = vi.fn(async () => true);

  beforeEach(() => {
    onAnswer = vi.fn(async () => true);
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
  });

  it("focuses the PIN input when a PIN prompt opens", async () => {
    render(InteractionModal, {
      props: { model: buildInteractionModalModel(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("submits the PIN prompt from Enter without rendering preview secrets", async () => {
    const user = userEvent.setup();
    render(InteractionModal, {
      props: { model: buildInteractionModalModel(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456{Enter}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({
      pin: "123456",
      confirmed: true,
      canceled: false,
    });
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "PRE" && element.textContent?.includes('"pinUvAuthToken": "[redacted]"'))).toBeInTheDocument();
  });

  it("cancels the prompt from Escape", async () => {
    const user = userEvent.setup();
    render(InteractionModal, {
      props: { model: buildInteractionModalModel(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456");
    await user.keyboard("{Escape}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({
      confirmed: false,
      canceled: true,
    });
  });

  it("submits a PIN prompt only once while resolution is pending", async () => {
    const user = userEvent.setup();
    let resolveAnswer!: () => void;
    onAnswer.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      resolveAnswer = () => resolve(true);
    }));
    render(InteractionModal, {
      props: { model: buildInteractionModalModel(pinPrompt()), onAnswer },
    });

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456{Enter}{Enter}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    resolveAnswer();
  });
});
