import { get } from "svelte/store";

import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { ResolveInteraction } from "../../bindings/fidobench/ctapkitservice";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { runtimeFailureFrom } from "./failure.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { sessionStatus } from "./features/session/state.js";
import { statusBar } from "./features/workbench/state.js";
import { applyInvalidSessionError } from "./session-boundary.js";
import { setStatusOperation, summarizeOperationFailure } from "./workbench-state.js";

export async function answerPendingInteraction(answer: InteractionAnswer) {
  const label = get(statusBar).activeOperation?.label ?? m.operation_running();
  try {
    const resolution = ResolveInteraction(answer);
    if (answer.pin) answer.pin = "";
    return await resolution;
  } catch (error) {
    const failure = runtimeFailureFrom(error);
    summarizeOperationFailure(label, failure);
    applyInvalidSessionError(failure);
    return false;
  } finally {
    if (answer.pin) answer.pin = "";
    pendingInteraction.set(null);
  }
}

export function handleInteractionRequested(data: InteractionPrompt) {
  pendingInteraction.set(data);
  const currentOperation = get(statusBar).activeOperation;
  const operation = currentOperation && (!currentOperation.operationId || currentOperation.operationId === data.operationId)
    ? currentOperation
    : null;
  setStatusOperation({
    ...operation,
    operationId: data.operationId,
    sessionId: data.sessionId,
    stage: OperationStage.OperationStageInteractionRequired,
  });
  sessionStatus.update((session) => (
    session.sessionId === data.sessionId && session.state !== "error"
      ? { ...session, state: "running" }
      : session
  ));
}
