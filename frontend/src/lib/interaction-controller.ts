import { get } from "svelte/store";

import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/telesma/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import { runtimeFailureFrom } from "./failure.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { authenticatorStatus } from "./features/authenticator/state.js";
import { statusBar } from "./features/workbench/state.js";
import { applyAuthenticatorClosedError } from "./authenticator-boundary.js";
import { setStatusOperation, summarizeOperationFailure } from "./workbench-state.js";

export async function answerPendingInteraction(answer: InteractionAnswer) {
  const label = get(statusBar).activeOperation?.label ?? m.operation_running();
  const interactionId = answer.interactionId;
  try {
    const resolution = api.resolveInteraction(answer);
    if (answer.pin) answer.pin = "";
    const accepted = await resolution;
    pendingInteraction.update((prompt) => prompt?.interactionId === interactionId ? null : prompt);
    return accepted;
  } catch (error) {
    const failure = runtimeFailureFrom(error);
    summarizeOperationFailure(label, failure);
		applyAuthenticatorClosedError(failure);
    return false;
  } finally {
    if (answer.pin) answer.pin = "";
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
    selectionId: data.selectionId,
    stage: OperationStage.OperationStageInteractionRequired,
  });
  authenticatorStatus.update((authenticator) => (
    authenticator.selectionId === data.selectionId && authenticator.state !== "error"
      ? { ...authenticator, state: "running" }
      : authenticator
  ));
}
