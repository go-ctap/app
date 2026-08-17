import { get } from "svelte/store";

import { m } from "../paraglide/messages.js";
import { api } from "$lib/api.js";
import { pendingInteraction } from "$lib/features/interaction/state.js";
import { statusBar, type ActiveOperation } from "$lib/features/workbench/state.js";
import { failureMessage, runtimeFailureFrom } from "$lib/failure.js";
import { finishOperation, setStatusOperation, setStatusOutcome } from "$lib/workbench-state.js";

export type CancelOperationResult = "accepted" | "already-finished" | "failed" | "unavailable";

function patchActiveOperation(patch: Partial<ActiveOperation>) {
  setStatusOperation({ ...get(statusBar).activeOperation!, ...patch });
}

export async function cancelActiveOperation(): Promise<CancelOperationResult> {
  const operation = get(statusBar).activeOperation;
  const operationId = operation?.operationId?.trim() || "";

  if (!operation || !operationId || operation.cancelPending || operation.cancelRequested)
    return "unavailable";

  patchActiveOperation({ cancelPending: true, cancelError: null });

  try {
    const accepted = await api.cancelOperation({ operationId });

    if (accepted) {
      patchActiveOperation({
        cancelPending: false,
        cancelRequested: true,
        cancelError: null,
      });
      pendingInteraction.set(null);

      return "accepted";
    }

    finishOperation();

    setStatusOutcome({
      tone: "info",
      title: m.operation_already_finished(),
      message: m.operation_already_finished_message(),
    });

    return "already-finished";
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    patchActiveOperation({
      cancelPending: false,
      cancelError: runtimeError,
    });

    setStatusOutcome({
      tone: "error",
      title: m.operation_cancel_failed(),
      message: failureMessage(runtimeError),
    });

    return "failed";
  }
}
