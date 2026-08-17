import { get } from "svelte/store";

import { OperationStage } from "../../bindings/github.com/telesma-app/kit/model";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/telesma/service";

import { m } from "../paraglide/messages.js";
import { api } from "$lib/api.js";
import { runtimeFailureFrom } from "$lib/failure.js";
import { pendingInteraction } from "$lib/features/interaction/state.js";
import { statusBar } from "$lib/features/workbench/state.js";
import { applyAuthenticatorClosedError } from "$lib/authenticator-boundary.js";
import { setStatusOperation, summarizeOperationFailure } from "$lib/workbench-state.js";

export async function answerPendingInteraction(answer: InteractionAnswer) {
  const label = get(statusBar).activeOperation?.label ?? m.operation_running();

  try {
    const resolution = api.resolveInteraction(answer);

    if (answer.pin) answer.pin = "";

    const accepted = await resolution;

    pendingInteraction.set(null);

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

  setStatusOperation({
    ...currentOperation,
    operationId: data.operationId,
    selectionId: data.selectionId,
    stage: OperationStage.OperationStageInteractionRequired,
  });
}
