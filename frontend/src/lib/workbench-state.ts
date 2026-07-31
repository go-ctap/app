import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { AuthenticatorSessionSnapshot } from "../../bindings/telesma/service";
import { m } from "../paraglide/messages.js";
import type { OperationEnvelope } from "$lib/api.js";
import { resetDeviceState } from "$lib/device-state.js";
import { pendingInteraction } from "$lib/features/interaction/state.js";
import { authenticatorSession } from "$lib/features/authenticator/state.js";
import {
  statusBar,
  type ActiveOperation,
  type StatusBarOutcome,
} from "$lib/features/workbench/state.js";
import { activeSelectionID } from "$lib/authenticator-boundary.js";
import { failureMessage, isCanceledFailure } from "$lib/failure.js";

export type SessionChange = {
  boundaryChanged: boolean;
  becameReady: boolean;
};

export function applySessionSnapshot(snapshot: AuthenticatorSessionSnapshot): SessionChange {
  const nextSelector = snapshot.selection?.attachmentId ?? "";
  const current = get(authenticatorSession);
  const nextReady = Boolean(snapshot.selection);
  const nextSelectionID = snapshot.selection?.id ?? "";
  const currentReady = current.authenticator.state === "ready";
  const currentSelectionID = currentReady ? current.authenticator.selectionId! : "";
  const boundaryChanged =
    nextSelector !== current.selectedAttachmentId ||
    (nextReady && currentReady && nextSelectionID !== currentSelectionID);
  const becameReady = nextReady && (!currentReady || nextSelectionID !== currentSelectionID);

  authenticatorSession.set({
    devices: snapshot.devices,
    selectedAttachmentId: nextSelector,
    authenticator: nextReady
      ? { selectionId: nextSelectionID, state: "ready" }
      : snapshot.error
        ? { state: "error", error: snapshot.error }
        : { state: "idle" },
  });

  if (boundaryChanged) {
    pendingInteraction.set(null);
    clearWorkbenchScreenCaches();
  }

  return { boundaryChanged, becameReady };
}

export function setAuthenticatorError(error: Failure) {
  authenticatorSession.update((session) => ({
    ...session,
    selectedAttachmentId: "",
    authenticator: { state: "error", error },
  }));
  clearWorkbenchScreenCaches();
}

export function clearAuthenticatorSession() {
  authenticatorSession.set({
    devices: [],
    selectedAttachmentId: "",
    authenticator: { state: "idle" },
  });
  clearWorkbenchScreenCaches();
}

export function setStatusOperation(operation: ActiveOperation | null) {
  statusBar.update((state) => ({ ...state, activeOperation: operation }));
}

export function beginOperation(label: string) {
  setStatusOperation({
    selectionId: activeSelectionID() || undefined,
    label,
  });
}

export function finishOperation() {
  setStatusOperation(null);
  pendingInteraction.set(null);
}

export function setStatusOutcome(outcome: StatusBarOutcome | null) {
  statusBar.update((state) => ({ ...state, lastOutcome: outcome }));
}

export function clearWorkbenchScreenCaches() {
  resetDeviceState();
}

export function summarizeEnvelope(label: string, envelope: OperationEnvelope) {
  finishOperation();

  const error = envelope.error;

  if (error) {
    const canceled = isCanceledFailure(error);
    const title = canceled
      ? m.operation_canceled_with_label({ label })
      : m.operation_failed_with_label({ label });
    const outcome: StatusBarOutcome = {
      tone: canceled ? "info" : "error",
      title,
      message: failureMessage(error),
    };

    setStatusOutcome(outcome);

    return;
  }

  setStatusOutcome({
    tone: "success",
    title: m.operation_complete_with_label({ label }),
    message: m.operation_finished_successfully(),
  });
}

export function summarizeOperationFailure(label: string, error: Failure) {
  summarizeOperationFailureWithMessage(label, error, failureMessage(error));
}

function summarizeOperationFailureWithMessage(label: string, error: Failure, message: string) {
  finishOperation();

  const canceled = isCanceledFailure(error);
  const title = canceled
    ? m.operation_canceled_with_label({ label })
    : m.operation_failed_with_label({ label });
  const outcome: StatusBarOutcome = {
    tone: canceled ? "info" : "error",
    title,
    message,
  };

  setStatusOutcome(outcome);
}
