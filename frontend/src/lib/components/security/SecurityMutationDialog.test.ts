import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind } from "../../../../bindings/github.com/go-ctap/kit/model";
import { AlwaysUVTarget } from "../../../../bindings/github.com/go-ctap/kit/model/config";
import { Code } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import {
  AlwaysUVRequest,
  AuthenticatorConfigEnvelope,
} from "../../../../bindings/github.com/go-ctap/kit/service";

import type { SecurityMutationState } from "$lib/features/security/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";

import SecurityMutationDialog from "./SecurityMutationDialog.svelte";

const request = new AlwaysUVRequest({
  sessionId: "session-1",
  target: AlwaysUVTarget.AlwaysUVTargetEnable,
  dryRun: true,
});
const previewEnvelope = new AuthenticatorConfigEnvelope({
  operationId: "preview-1",
  sessionId: "session-1",
  kind: OperationKind.OperationSetAlwaysUV,
});

function errorMutation(failedPhase: "previewing" | "executing", code: Code): SecurityMutationState {
  return {
    kind: "alwaysUv",
    target: AlwaysUVTarget.AlwaysUVTargetEnable,
    phase: "error",
    failedPhase,
    previewRequest: request,
    previewEnvelope: failedPhase === "executing" ? previewEnvelope : null,
    responseEnvelope: new AuthenticatorConfigEnvelope({
      operationId: "response-1",
      sessionId: "session-1",
      kind: OperationKind.OperationSetAlwaysUV,
      error: failureForCode(code),
    }),
    runtimeError: null,
    failureReason: "response-error",
    validationError: null,
  };
}

function renderDialog(mutation: SecurityMutationState) {
  const callbacks = {
    onConfirm: vi.fn(async () => true),
    onPreview: vi.fn(async () => true),
    onClose: vi.fn(),
    onCancelOperation: vi.fn(async () => {}),
  };
  render(SecurityMutationDialog, {
    props: {
      mutation,
      activeOperation: null,
      disabled: false,
      ...callbacks,
    },
  });
  return callbacks;
}

describe("SecurityMutationDialog", () => {
  beforeEach(() => setAppLocale("en"));
  afterEach(() => cleanup());

  it("repeats a failed preview through the named operation action", async () => {
    const callbacks = renderDialog(errorMutation("previewing", Code.CodeTransportFailure));

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Waiting for authenticator response." })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Update Always UV" }));

    expect(callbacks.onPreview).toHaveBeenCalledOnce();
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
  });

  it("keeps the confirmation action after an incorrect PIN", async () => {
    const callbacks = renderDialog(errorMutation("executing", Code.CodePINInvalid));

    await userEvent.click(screen.getByRole("button", { name: "Update Always UV" }));

    expect(callbacks.onConfirm).toHaveBeenCalledOnce();
    expect(callbacks.onPreview).not.toHaveBeenCalled();
  });

  it("shows only Close after another execution failure", async () => {
    const callbacks = renderDialog(errorMutation("executing", Code.CodeTransportFailure));

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update Always UV" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Waiting for authenticator response." })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(callbacks.onClose).toHaveBeenCalledOnce();
  });

  it("keeps one spinner on the named action while a preview is running", () => {
    renderDialog({
      kind: "alwaysUv",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      phase: "previewing",
      previewRequest: request,
    });

    const action = screen.getByRole("button", { name: "Update Always UV" });
    expect(action).toBeDisabled();
    expect(screen.queryByText("Waiting for authenticator response.")).not.toBeInTheDocument();
    expect(action.querySelectorAll("svg")).toHaveLength(1);
    expect(document.querySelectorAll("svg[role=\"status\"]")).toHaveLength(1);
  });
});
