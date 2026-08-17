import { get } from "svelte/store";

import type { OperationEventEnvelope } from "../../bindings/telesma/service";

import { statusBar } from "$lib/features/workbench/state.js";
import { setStatusOperation } from "$lib/workbench-state.js";

export function handleOperationProgress(data: OperationEventEnvelope) {
  const currentOperation = get(statusBar).activeOperation;

  setStatusOperation({
    ...currentOperation,
    operationId: data.operationId,
    selectionId: data.selectionId,
    stage: data.event.stage,
    completed: data.event.completed,
    total: data.event.total,
    sampleStatus: data.event.sampleStatus,
  });
}
