import { get } from "svelte/store";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

import { m } from "../paraglide/messages.js";
import { api } from "$lib/api.js";
import { authenticatorSession } from "$lib/features/authenticator/state.js";
import { pendingInteraction } from "$lib/features/interaction/state.js";
import { deviceName } from "$lib/format.js";
import { failureMessage, runtimeFailureFrom } from "$lib/failure.js";
import { reportForSelector } from "$lib/authenticator-model.js";
import {
  applyDiscovery,
  applySelection,
  clearAuthenticatorSession,
  clearWorkbenchScreenCaches,
  finishOperation,
  setAuthenticatorError,
  setAuthenticatorOpening,
  setStatusOutcome,
} from "$lib/workbench-state.js";

export async function bootstrapAuthenticatorSession() {
  try {
    const snapshot = await api.discover();

    applyDiscovery(snapshot);
    if (snapshot.error) {
      setStatusOutcome({
        tone: "error",
        title: m.discovery_issue(),
        message: failureMessage(snapshot.error),
      });
    }
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);

    setAuthenticatorError(runtimeError);
    setStatusOutcome({
      tone: "error",
      title: m.discovery_issue(),
      message: failureMessage(runtimeError),
    });
  }
}

export async function selectAuthenticatorSession(selector: string) {
  const requestedSelector = selector.trim();
  const device = reportForSelector(get(authenticatorSession).devices, requestedSelector);
  const attachmentId = device?.attachment.id ?? "";

  clearWorkbenchScreenCaches();
  pendingInteraction.set(null);
  if (attachmentId) setAuthenticatorOpening(attachmentId);

  try {
    const response = await api.setSelection({ attachmentId });

    applySelection(response.selection ?? null);
    setStatusOutcome({
      tone: "info",
      title: m.token_selected(),
      message: device ? deviceName(device) : selector || m.selection_updated(),
    });
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);

    setAuthenticatorError(runtimeError);
    setStatusOutcome({
      tone: "error",
      title: m.token_selection_issue(),
      message: failureMessage(runtimeError),
    });
  }
}

/**
 * Factory reset invalidates the selected authenticator as an application
 * boundary. Close it, clear selection-owned state, then let discovery apply
 * the normal backend-owned auto-selection rule.
 */
export async function rediscoverAfterFactoryReset(): Promise<Failure | null> {
  let closeError: Failure | null = null;

  try {
    await api.setSelection({ attachmentId: "" });
  } catch (error) {
    closeError = runtimeFailureFrom(error);
  }

  pendingInteraction.set(null);
  finishOperation();
  clearAuthenticatorSession();

  try {
    const snapshot = await api.discover();

    applyDiscovery(snapshot);

    return snapshot.error ?? closeError;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);

    setAuthenticatorError(runtimeError);

    return runtimeError;
  }
}

export async function shutdownWorkbench() {
  try {
    await api.setSelection({ attachmentId: "" });
  } finally {
    pendingInteraction.set(null);
    finishOperation();
    clearAuthenticatorSession();
  }
}
