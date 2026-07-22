import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Kind as OperationKind } from "../../../../bindings/github.com/go-ctap/kit/model/operation";
import { StateValue } from "../../../../bindings/github.com/go-ctap/kit/model/config";
import { Code } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import { PreviewMode, Severity } from "../../../../bindings/github.com/go-ctap/kit/model/safety";
import type { ResetFactoryEnvelope } from "../../../../bindings/telesma/service";

import type { SecurityMutationState } from "$lib/features/security/state";
import { failureForCode } from "$lib/test-failure";
import { setAppLocale } from "$lib/i18n";
import { setAdvancedMode } from "$lib/preferences";

import SecurityMutationDetails from "./SecurityMutationDetails.svelte";

function erroredPreviewMutation(longTouchForReset = StateValue.StateSupported): SecurityMutationState {
  const responseEnvelope = {
    operationId: "reset-preview-error",
    selectionId: "authenticator-1",
    kind: OperationKind.ResetFactory,
    error: failureForCode(Code.CodeResetWindowExpired),
    result: {
      preview: {
        device: { fingerprint: "token-1" },
        resetHints: {
          longTouchForReset,
          transportsForReset: ["usb"],
        },
        mode: PreviewMode.PreviewModeDryRun,
        warnings: [{
          severity: Severity.SeverityDestructive,
          code: "reset.factory.destructive",
          message: "backend fallback",
        }],
      },
      result: null,
    },
  } as unknown as ResetFactoryEnvelope;

  return {
    kind: "reset",
    phase: "error",
    failedPhase: "previewing",
    previewRequest: { selectionId: "authenticator-1", dryRun: true },
    previewEnvelope: null,
    responseEnvelope,
    runtimeError: null,
    failureReason: "response-error",
    validationError: null,
  };
}

describe("SecurityMutationDetails", () => {
  beforeEach(() => {
    setAppLocale("en");
    setAdvancedMode(true);
  });
  afterEach(() => cleanup());

  it("keeps a typed preview and its localized warning visible when its envelope also has an error", () => {
    render(SecurityMutationDetails, {
      props: { mutation: erroredPreviewMutation(), activeOperation: null },
    });

    expect(screen.getByText("The authenticator reset window has expired.")).toBeInTheDocument();
    expect(screen.getByText("usb")).toBeInTheDocument();
    expect(screen.getByText("Factory reset permanently removes authenticator state and cannot be undone.")).toBeInTheDocument();
    expect(screen.queryByText("reset.factory.destructive")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview JSON" })).toHaveAttribute("aria-expanded", "false");
  });

  it("localizes an unknown long-touch reset hint", () => {
    setAppLocale("ru");

    render(SecurityMutationDetails, {
      props: {
        mutation: erroredPreviewMutation(StateValue.StateUnknown),
        activeOperation: null,
      },
    });

    expect(screen.getByText("Неизвестно")).toBeInTheDocument();
    expect(screen.queryByText("unknown")).not.toBeInTheDocument();
  });
});
