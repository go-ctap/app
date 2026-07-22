import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { InteractionKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope, InteractionPrompt } from "../../bindings/telesma/service";

import { pendingInteraction } from "./features/interaction/state.js";
import { authenticatorStatus } from "./features/authenticator/state.js";
import { applyOperationAuthenticatorBoundary } from "./authenticator-boundary.js";
import { failureForCode } from "./test-failure.js";

function envelope(authenticatorClosed: boolean, code: Code): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    authenticatorClosed,
    error: failureForCode(code),
  } as CredentialsEnvelope;
}

describe("operation authenticator boundary", () => {
  beforeEach(() => {
    authenticatorStatus.set({ state: "running", selectionId: "authenticator-1" });
    pendingInteraction.set({
      operationId: "operation-1",
      selectionId: "authenticator-1",
      interactionId: "interaction-1",
      request: { kind: InteractionKind.InteractionKindTouch },
    } as InteractionPrompt);
  });

  it("clears a closed authenticator independently of the failure category", () => {
    const response = envelope(true, Code.CodeOperationCanceled);

    applyOperationAuthenticatorBoundary(response);

    expect(get(authenticatorStatus)).toEqual({ state: "error", error: response.error });
    expect(get(pendingInteraction)).toBeNull();
  });

  it("keeps the authenticator after a non-closing transport failure", () => {
    applyOperationAuthenticatorBoundary(envelope(false, Code.CodeTransportFailure));

    expect(get(authenticatorStatus)).toEqual({ state: "running", selectionId: "authenticator-1" });
    expect(get(pendingInteraction)?.interactionId).toBe("interaction-1");
  });
});
