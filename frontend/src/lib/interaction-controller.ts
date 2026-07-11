import { get } from "svelte/store";

import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { ResolveInteraction } from "../../bindings/fidobench/ctapkitservice";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen, statusBar } from "./features/workbench/state.js";
import { operationStageLabel } from "./format.js";
import { appendLogEntry, setStatusOperation } from "./workbench-state.js";

export async function answerPendingInteraction(answer: InteractionAnswer) {
  try {
    return await ResolveInteraction(answer);
  } finally {
    pendingInteraction.set(null);
  }
}

export function handleInteractionRequested(data: InteractionPrompt) {
  pendingInteraction.set(data);
  const logEntryId = appendLogEntry({
    tone: "warning",
    source: "operation-interaction",
    title: m.stage_interaction_required(),
    message: operationStageLabel("interaction-required"),
    operationId: data.operationId,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      operationId: data.operationId,
      interactionId: data.interactionId,
      request: {
        kind: data.request.kind,
        permission: data.request.permission,
        destructive: data.request.destructive,
        hasPreview: Boolean(data.request.preview),
      },
    },
  });

  const currentOperation = get(statusBar).activeOperation;
  const operation = currentOperation && (!currentOperation.operationId || currentOperation.operationId === data.operationId)
    ? currentOperation
    : null;
  setStatusOperation({
    ...operation,
    operationId: data.operationId,
    sessionId: data.sessionId,
    logEntryId,
    event: {
      ...operation?.event,
      stage: OperationStage.OperationStageInteractionRequired,
      kind: data.request.kind,
      message: data.request.message || operationStageLabel(OperationStage.OperationStageInteractionRequired),
    },
  });
  sessionStatus.update((session) => (
    session.sessionId === data.sessionId && session.state !== "error"
      ? { ...session, state: "running", activeOperation: data.operationId }
      : session
  ));
}
