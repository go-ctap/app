import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Kind as OperationKind } from "../../../../bindings/github.com/go-ctap/kit/model/operation";
import { AlwaysUVTarget } from "../../../../bindings/github.com/go-ctap/kit/model/config";
import { Code } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import {
  AlwaysUVRequest,
  AuthenticatorConfigEnvelope,
  BioEnrollEnvelope,
  BioEnrollRequest,
  ResetFactoryEnvelope,
  ResetFactoryRequest,
} from "../../../../bindings/fidobench/service";

import type { SecurityMutationState } from "$lib/features/security/state";
import type { ActiveOperation } from "$lib/features/workbench/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";

import SecurityMutationDialog from "./SecurityMutationDialog.svelte";

const request = new AlwaysUVRequest({
  selectionId: "authenticator-1",
  target: AlwaysUVTarget.AlwaysUVTargetEnable,
  dryRun: true,
});
const previewEnvelope = new AuthenticatorConfigEnvelope({
  operationId: "preview-1",
  selectionId: "authenticator-1",
  kind: OperationKind.SetAlwaysUV,
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
      selectionId: "authenticator-1",
      kind: OperationKind.SetAlwaysUV,
      error: failureForCode(code),
    }),
    runtimeError: null,
    failureReason: "response-error",
    validationError: null,
  };
}

function executingBioEnrollment(): SecurityMutationState {
  return {
    kind: "bioEnroll",
    timeoutMilliseconds: 60_000,
    phase: "executing",
    previewRequest: new BioEnrollRequest({
      selectionId: "authenticator-1",
      timeoutMilliseconds: 60_000,
      dryRun: true,
    }),
    previewEnvelope: new BioEnrollEnvelope({
      operationId: "bio-preview-1",
      selectionId: "authenticator-1",
      kind: OperationKind.BioEnroll,
    }),
  };
}

function renderDialog(
  mutation: SecurityMutationState,
  activeOperation: ActiveOperation | null = null,
) {
  const callbacks = {
    onConfirm: vi.fn(async () => true),
    onPreview: vi.fn(async () => true),
    onClose: vi.fn(),
    onCancelOperation: vi.fn(async () => {}),
  };
  render(SecurityMutationDialog, {
    props: {
      mutation,
      activeOperation,
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

  it.each([
    Code.CodePINInvalid,
    Code.CodePINPolicyViolation,
    Code.CodeTransportFailure,
  ])("keeps the confirmation action after execution error %s", async (code) => {
    const callbacks = renderDialog(errorMutation("executing", code));

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Waiting for authenticator response." })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Update Always UV" }));

    expect(callbacks.onConfirm).toHaveBeenCalledOnce();
    expect(callbacks.onPreview).not.toHaveBeenCalled();
  });

  it("keeps the destructive action after any execution failure", async () => {
    const request = new ResetFactoryRequest({ selectionId: "authenticator-1", dryRun: true });
    const previewEnvelope = new ResetFactoryEnvelope({
      operationId: "reset-preview-1",
      selectionId: "authenticator-1",
      kind: OperationKind.ResetFactory,
    });
    const callbacks = renderDialog({
      kind: "reset",
      phase: "error",
      failedPhase: "executing",
      previewRequest: request,
      previewEnvelope,
      responseEnvelope: new ResetFactoryEnvelope({
        operationId: "reset-response-1",
        selectionId: "authenticator-1",
        kind: OperationKind.ResetFactory,
        error: failureForCode(Code.CodeTransportFailure),
      }),
      runtimeError: null,
      failureReason: "response-error",
      validationError: null,
    });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset authenticator" }));

    expect(callbacks.onConfirm).toHaveBeenCalledOnce();
    expect(callbacks.onPreview).not.toHaveBeenCalled();
  });

  it("leaves preview progress to the global status bar", () => {
    renderDialog({
      kind: "alwaysUv",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      phase: "previewing",
      previewRequest: request,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves ordinary execution progress to the global status bar", () => {
    renderDialog({
      kind: "alwaysUv",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      phase: "executing",
      previewRequest: request,
      previewEnvelope,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps biometric enrollment open so it can be canceled", async () => {
    const user = userEvent.setup();
    const callbacks = renderDialog(executingBioEnrollment());

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(callbacks.onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel enrollment" }));

    expect(callbacks.onCancelOperation).toHaveBeenCalledOnce();
  });

  it("marks biometric enrollment with concise capture guidance", () => {
    renderDialog(
      executingBioEnrollment(),
      { completed: 1, total: 4, sampleStatus: "good" },
    );

    expect(screen.getByRole("heading", { name: "Enroll biometric" })).toBeInTheDocument();
    expect(screen.getByText("Complete each capture requested by the authenticator.")).toBeInTheDocument();
    expect(screen.getByText("Latest sample: Good fingerprint sample")).toBeInTheDocument();
    expect(screen.getByRole("dialog").querySelector("[data-prompt-visual] .lucide-fingerprint-pattern")).toBeInTheDocument();
  });
});
