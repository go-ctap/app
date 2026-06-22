import { get } from "svelte/store";

import type { InteractionPrompt, OperationEventEnvelope, RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { pendingInteraction } from "./features/interaction/state.js";
import { sessionStatus } from "./features/session/state.js";
import { statusBar } from "./features/workbench/state.js";

export function currentSessionId() {
  return get(sessionStatus).sessionId || "";
}

export function selectedSessionId() {
  const sessionId = currentSessionId();
  if (!sessionId) throw new Error("authenticator session is required");
  return sessionId;
}

export function matchesCurrentSession(sessionId: string | undefined) {
  const current = currentSessionId();
  return Boolean(current && sessionId && sessionId === current);
}

export function operationEventMatchesCurrentSession(data: OperationEventEnvelope) {
  return matchesCurrentSession(data.sessionId);
}

export function interactionMatchesCurrentSession(prompt: InteractionPrompt) {
  return matchesCurrentSession(prompt.sessionId);
}

export function currentSessionActiveOperationId() {
  const current = currentSessionId();
  const activeOperation = get(statusBar).activeOperation;
  if (activeOperation?.operationId && activeOperation.sessionId === current) return activeOperation.operationId;

  const prompt = get(pendingInteraction);
  if (prompt && prompt.operationId && prompt.sessionId === current) return prompt.operationId;

  return "";
}

export function applyInvalidSessionError(error: RuntimeErrorEnvelope | null | undefined) {
  if (error?.category !== "invalid-session") return;
  pendingInteraction.set(null);
  sessionStatus.update((state) => ({
    ...state,
    state: "stale",
    error,
  }));
}
