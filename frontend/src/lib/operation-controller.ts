import { get } from "svelte/store";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { selectedDevice, sessionStatus } from "./features/session/state.js";
import { statusBar, type ActiveOperation } from "./features/workbench/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import {
  finishOperation,
  setStatusOperation,
  setStatusOutcome,
} from "./workbench-state.js";

export type CancelOperationResult = "accepted" | "already-finished" | "failed" | "unavailable";

function currentOperation(operationId: string) {
  const operation = get(statusBar).activeOperation;
  return operation?.operationId === operationId ? operation : null;
}

function patchCurrentOperation(operationId: string, patch: Partial<ActiveOperation>) {
  const operation = currentOperation(operationId);
  if (!operation) return false;
  setStatusOperation({ ...operation, ...patch });
  return true;
}

export async function cancelActiveOperation(): Promise<CancelOperationResult> {
  const operation = get(statusBar).activeOperation;
  const operationId = operation?.operationId?.trim() || "";
  if (!operationId || operation?.cancelPending || operation?.cancelRequested) return "unavailable";

  patchCurrentOperation(operationId, { cancelPending: true, cancelError: null });

  try {
    const accepted = await api.cancelOperation({ operationId });
    if (accepted) {
      patchCurrentOperation(operationId, {
        cancelPending: false,
        cancelRequested: true,
        cancelError: null,
      });
      pendingInteraction.update((prompt) => prompt?.operationId === operationId ? null : prompt);
      return "accepted";
    }

    if (currentOperation(operationId)) finishOperation();
    setStatusOutcome({
      tone: "info",
      title: m.operation_already_finished(),
      message: m.operation_already_finished_message(),
    });
    return "already-finished";
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    const stillActive = patchCurrentOperation(operationId, {
      cancelPending: false,
      cancelError: runtimeError,
    });
    if (stillActive) {
      setStatusOutcome({
        tone: "error",
        title: m.operation_cancel_failed(),
        message: runtimeError.message,
      });
    }
    return "failed";
  }
}

export async function retryLastStatusOutcome() {
  const session = get(sessionStatus);
  const retry = get(statusBar).lastOutcome?.retry;
  if (session.state !== "ready" || !session.sessionId || !get(selectedDevice) || !retry) return false;
  await retry();
  return true;
}
