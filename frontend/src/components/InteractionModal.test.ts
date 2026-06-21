import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractionKind, InteractionRequest } from "../../bindings/github.com/go-ctap/kit/model";
import { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import { pendingInteraction } from "$lib/stores";
import InteractionModal from "./InteractionModal.svelte";

const { answerPendingInteraction } = vi.hoisted(() => ({
  answerPendingInteraction: vi.fn(async () => true),
}));

vi.mock("../lib/controller", () => ({
  answerPendingInteraction,
}));

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
  beforeEach(() => {
    answerPendingInteraction.mockClear();
    pendingInteraction.set(null);
  });

  afterEach(() => {
    pendingInteraction.set(null);
    cleanup();
  });

  it("focuses the PIN input when a PIN prompt opens", async () => {
    pendingInteraction.set(pinPrompt());
    render(InteractionModal);

    const input = await screen.findByLabelText("PIN");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("submits the PIN prompt from Enter without rendering preview secrets", async () => {
    const user = userEvent.setup();
    pendingInteraction.set(pinPrompt());
    render(InteractionModal);

    const input = await screen.findByLabelText("PIN");
    await user.type(input, "123456{Enter}");

    expect(answerPendingInteraction).toHaveBeenCalledTimes(1);
    expect(answerPendingInteraction).toHaveBeenCalledWith({
      pin: "123456",
      confirmed: true,
      canceled: false,
    });
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "PRE" && element.textContent?.includes('"pinUvAuthToken": "[redacted]"'))).toBeInTheDocument();
  });

  it("cancels the prompt from Escape", async () => {
    const user = userEvent.setup();
    pendingInteraction.set(pinPrompt());
    render(InteractionModal);

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(answerPendingInteraction).toHaveBeenCalledTimes(1);
    expect(answerPendingInteraction).toHaveBeenCalledWith({
      pin: "",
      confirmed: false,
      canceled: true,
    });
  });
});
