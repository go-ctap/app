import { get } from "svelte/store";

import type { OperationEvent } from "../../bindings/github.com/go-ctap/kit/model";
import type { OperationEventEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { selectedSelector } from "./features/session/state.js";
import { activeScreen, statusBar } from "./features/workbench/state.js";
import { operationStageLabel } from "./format.js";
import { appendLogEntry, setStatusOperation } from "./workbench-state.js";

function progressLabel(value: OperationEvent) {
  if (value.completed !== undefined && value.total !== undefined) {
    return `${value.completed} / ${value.total}`;
  }
  return operationStageLabel(value.stage);
}

function operationEventData(data: OperationEventEnvelope) {
  const event = data.event;
  return {
    operationId: data.operationId,
    sessionId: data.sessionId,
    stage: event.stage,
    message: event.message,
    progress: event.completed !== undefined || event.total !== undefined ? { completed: event.completed, total: event.total } : undefined,
  };
}

export function handleOperationProgress(data: OperationEventEnvelope) {
  if (!data.operationId) {
    setStatusOperation(null);
    return;
  }

  const logEntryId = appendLogEntry({
    tone: "info",
    source: "operation-progress",
    title: data.event.message || operationStageLabel(data.event.stage),
    message: progressLabel(data.event),
    operationId: data.operationId,
    stage: data.event.stage,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: operationEventData(data),
  });

  const currentOperation = get(statusBar).activeOperation;
  setStatusOperation(currentOperation ? { ...currentOperation, ...data, logEntryId } : { ...data, logEntryId });
}
