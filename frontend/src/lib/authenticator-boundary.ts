import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

import type { OperationEnvelope } from "./api.js";
import { isAuthenticatorClosedFailure } from "./failure.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { authenticatorStatus } from "./features/authenticator/state.js";

export function activeSelectionID() {
  return get(authenticatorStatus).selectionId || "";
}

export function currentSelectionID() {
  const selectionId = activeSelectionID();
  if (!selectionId) throw new Error("selected authenticator is required");
  return selectionId;
}

export function applyAuthenticatorClosedError(error: Failure | null | undefined) {
	if (!isAuthenticatorClosedFailure(error)) return;
  clearAuthenticator(error);
}

export function applyOperationAuthenticatorBoundary(envelope: OperationEnvelope) {
  if (envelope.authenticatorClosed) {
    clearAuthenticator(envelope.error);
    return;
  }
	applyAuthenticatorClosedError(envelope.error);
}

function clearAuthenticator(error: Failure | null | undefined) {
  pendingInteraction.set(null);
  authenticatorStatus.update((state) => {
    const { selectionId: _selectionId, error: _error, ...rest } = state;
    if (!error) return { ...rest, state: "idle" };
    return {
      ...rest,
      state: "error",
      error,
    };
  });
}
