import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope, InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { pendingInteraction } from "./features/interaction/state.js";
import { sessionStatus } from "./features/session/state.js";
import { applyOperationSessionBoundary } from "./session-boundary.js";
import { failureForCode } from "./test-failure.js";

function envelope(sessionClosed: boolean, code: Code): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListCredentials,
    sessionClosed,
    error: failureForCode(code),
  } as CredentialsEnvelope;
}

describe("operation session boundary", () => {
  beforeEach(() => {
    sessionStatus.set({ state: "running", sessionId: "session-1" });
    pendingInteraction.set({
      operationId: "operation-1",
      sessionId: "session-1",
      interactionId: "interaction-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);
  });

  it("clears a closed session independently of the failure category", () => {
    const response = envelope(true, Code.CodeOperationCanceled);

    applyOperationSessionBoundary(response);

    expect(get(sessionStatus)).toEqual({ state: "error", error: response.error });
    expect(get(pendingInteraction)).toBeNull();
  });

  it("keeps the session after a non-closing transport failure", () => {
    applyOperationSessionBoundary(envelope(false, Code.CodeTransportFailure));

    expect(get(sessionStatus)).toEqual({ state: "running", sessionId: "session-1" });
    expect(get(pendingInteraction)?.interactionId).toBe("interaction-1");
  });
});
