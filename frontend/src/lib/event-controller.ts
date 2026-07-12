import { get } from "svelte/store";

import type { OperationEventEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { sessionStatus } from "./features/session/state.js";
import { statusBar } from "./features/workbench/state.js";
import { setStatusOperation } from "./workbench-state.js";

export function handleOperationProgress(data: OperationEventEnvelope) {
  if (!data.operationId) {
    setStatusOperation(null);
    return;
  }

  const currentOperation = get(statusBar).activeOperation;
  const canMerge = currentOperation && (!currentOperation.operationId || currentOperation.operationId === data.operationId);
  setStatusOperation({
    ...(canMerge ? currentOperation : {}),
    operationId: data.operationId,
    sessionId: data.sessionId,
    stage: data.event.stage,
    completed: data.event.completed,
    total: data.event.total,
  });
  sessionStatus.update((session) => (
    session.sessionId === data.sessionId && session.state !== "error"
      ? { ...session, state: "running" }
      : session
  ));
}
