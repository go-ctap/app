import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Kind as OperationKind } from "../../../../bindings/github.com/telesma-app/kit/model/operation";
import { StateValue } from "../../../../bindings/github.com/telesma-app/kit/model/config";
import { Code } from "../../../../bindings/github.com/telesma-app/kit/model/failure";
import {
  PreviewMode,
  Severity,
} from "../../../../bindings/github.com/telesma-app/kit/model/safety";
import type { ResetFactoryEnvelope } from "../../../../bindings/telesma/service";

import type { SecurityMutationState } from "$lib/features/security/state";
import { testHIDDevice } from "../../../test/device.js";
import { failureForCode } from "$lib/test-support/failure";
import { setAppLocale } from "$lib/i18n";
import { setAdvancedMode } from "$lib/preferences";

import SecurityMutationDetails from "$lib/components/security/SecurityMutationDetails.svelte";

function erroredExecutionMutation(
  longTouchForReset = StateValue.StateSupported,
): SecurityMutationState {
  const previewEnvelope = {
    operationId: "reset-preview",
    selectionId: "authenticator-1",
    kind: OperationKind.ResetFactory,
    result: {
      preview: {
        device: testHIDDevice(),
        resetHints: {
          longTouchForReset,
          transportsForReset: ["usb"],
        },
        mode: PreviewMode.PreviewModeDryRun,
        warnings: [
          {
            severity: Severity.SeverityDestructive,
            code: "reset.factory.destructive",
            message: "backend fallback",
          },
        ],
      },
      result: null,
    },
  } as unknown as ResetFactoryEnvelope;
  const responseEnvelope = {
    operationId: "reset-error",
    selectionId: "authenticator-1",
    kind: OperationKind.ResetFactory,
    error: failureForCode(Code.CodeResetWindowExpired),
  } as unknown as ResetFactoryEnvelope;

  return {
    kind: "reset",
    operation: {
      phase: "error",
      failedPhase: "executing",
      previewEnvelope,
      previewValue: previewEnvelope.result!.preview,
      request: { dryRun: false },
      responseEnvelope,
      runtimeError: null,
    },
  };
}

describe("SecurityMutationDetails", () => {
  beforeEach(() => {
    setAppLocale("en");
    setAdvancedMode(true);
  });
  afterEach(() => cleanup());

  it("keeps a successful preview visible after a separate execution error", () => {
    render(SecurityMutationDetails, {
      props: { mutation: erroredExecutionMutation(), activeOperation: null },
    });

    expect(screen.getByText("The authenticator reset window has expired.")).toBeInTheDocument();
    expect(screen.getByText("usb")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Factory reset permanently removes authenticator state and cannot be undone.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("reset.factory.destructive")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview JSON" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps authenticator configuration details out of the reset preview", () => {
    setAppLocale("ru");

    render(SecurityMutationDetails, {
      props: {
        mutation: erroredExecutionMutation(StateValue.StateUnknown),
        activeOperation: null,
      },
    });

    expect(screen.queryByText("Долгое касание для сброса")).not.toBeInTheDocument();
    expect(screen.getByText("usb")).toBeInTheDocument();
  });
});
