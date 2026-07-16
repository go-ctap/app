import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

import type { OperationEnvelope } from "./api.js";
import { isInvalidSessionFailure } from "./failure.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { sessionStatus } from "./features/session/state.js";

export function currentSessionId() {
  return get(sessionStatus).sessionId || "";
}

export function selectedSessionId() {
  const sessionId = currentSessionId();
  if (!sessionId) throw new Error("authenticator session is required");
  return sessionId;
}

export function applyInvalidSessionError(error: Failure | null | undefined) {
  if (!isInvalidSessionFailure(error)) return;
  clearSession(error);
}

export function applyOperationSessionBoundary(envelope: OperationEnvelope) {
  if (envelope.sessionClosed) {
    clearSession(envelope.error);
    return;
  }
  applyInvalidSessionError(envelope.error);
}

function clearSession(error: Failure | null | undefined) {
  pendingInteraction.set(null);
  sessionStatus.update((state) => {
    const { sessionId: _sessionId, error: _error, ...rest } = state;
    if (!error) return { ...rest, state: "idle" };
    return {
      ...rest,
      state: "error",
      error,
    };
  });
}
