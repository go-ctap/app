import { get } from "svelte/store";

import type { OperationEventEnvelope } from "../../bindings/telesma/service";

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
}
