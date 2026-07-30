import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { ActiveSelection, AuthenticatorSessionSnapshot } from "../../bindings/telesma/service";
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

export function applyDiscovery(snapshot: AuthenticatorSessionSnapshot): boolean {
  const nextSelector = snapshot.selection?.attachmentId ?? "";
  const current = get(authenticatorSession);
  const previousSelectionID = current.authenticator.selectionId ?? "";
  const nextSelectionID = snapshot.selection?.id ?? "";
  const changed =
    nextSelector !== current.selectedAttachmentId || nextSelectionID !== previousSelectionID;

  authenticatorSession.set({
    devices: snapshot.devices,
    selectedAttachmentId: nextSelector,
    authenticator: snapshot.selection
      ? { selectionId: snapshot.selection.id, state: "ready" }
      : snapshot.error
        ? { state: "error", error: snapshot.error }
        : { state: "idle" },
  });

  if (changed) {
    clearWorkbenchScreenCaches();
  }

  return changed;
}

export function applySelection(selection: ActiveSelection | null) {
  const current = get(authenticatorSession);
  const nextSelector = selection?.attachmentId ?? "";
  const changed = nextSelector !== current.selectedAttachmentId;

  authenticatorSession.set({
    ...current,
    selectedAttachmentId: nextSelector,
    authenticator: selection ? { selectionId: selection.id, state: "ready" } : { state: "idle" },
  });

  if (changed) clearWorkbenchScreenCaches();

  return changed;
}

export function setAuthenticatorOpening(selectedAttachmentId: string) {
  authenticatorSession.update((session) => ({
    ...session,
    selectedAttachmentId,
    authenticator: { state: "opening" },
  }));
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
