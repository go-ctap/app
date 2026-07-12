import { get } from "svelte/store";

import type { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

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

export function applyInvalidSessionError(error: RuntimeErrorEnvelope | null | undefined) {
  if (error?.category !== "invalid-session") return;
  pendingInteraction.set(null);
  sessionStatus.update((state) => {
    const { sessionId: _sessionId, ...rest } = state;
    return {
      ...rest,
      state: "error",
      error,
    };
  });
}
