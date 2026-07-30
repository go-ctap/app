import { get } from "svelte/store";

import type { OperationEventEnvelope } from "../../bindings/telesma/service";

import { authenticatorStatus } from "$lib/features/authenticator/state.js";
import { statusBar } from "$lib/features/workbench/state.js";
import { setStatusOperation } from "$lib/workbench-state.js";

export function handleOperationProgress(data: OperationEventEnvelope) {
  if (!data.operationId) {
    setStatusOperation(null);

    return;
  }

  const currentOperation = get(statusBar).activeOperation;
  const canMerge =
    currentOperation &&
    (!currentOperation.operationId || currentOperation.operationId === data.operationId);

  setStatusOperation({
    ...(canMerge ? currentOperation : {}),
    operationId: data.operationId,
    selectionId: data.selectionId,
    stage: data.event.stage,
    completed: data.event.completed,
    total: data.event.total,
    sampleStatus: data.event.sampleStatus,
  });
  authenticatorStatus.update((authenticator) =>
    authenticator.selectionId === data.selectionId && authenticator.state !== "error"
      ? { ...authenticator, state: "running" }
      : authenticator,
  );
}
