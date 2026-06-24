import { get } from "svelte/store";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  passkeysInventory,
} from "./features/passkeys/state.js";
import {
  errorLoadState,
  idleLoadState,
  loadingLoadState,
  readyLoadState,
} from "./load-state.js";
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { beginOperation, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

function passkeysAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const sessionId = get(sessionStatus).sessionId || "";
  return selector && sessionId ? `${selector}:${sessionId}` : "";
}

function shouldAutoLoadPasskeys() {
  return get(activeScreen) === "passkeys" && Boolean(passkeysAutoLoadKey()) && !get(passkeysInventory).data && get(passkeysInventory).state !== "loading";
}

export async function maybeLoadPasskeys() {
  if (!shouldAutoLoadPasskeys()) return;
  await loadPasskeys();
}

export async function loadPasskeys() {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    passkeysInventory.set(idleLoadState());
    return;
  }

  passkeysInventory.set(loadingLoadState(get(passkeysInventory).data));
  try {
    beginOperation(m.credential_inventory(), "passkeys-inventory");
    const envelope = await api.listCredentials({ sessionId: selectedSessionId() });
    if (envelope.error) {
      passkeysInventory.set(errorLoadState(envelope.error, envelope));
    } else {
      passkeysInventory.set(readyLoadState(envelope));
    }
    summarizeEnvelope(m.credential_inventory(), envelope, "passkeys-inventory", () => loadPasskeys());
    applyInvalidSessionError(envelope.error);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    passkeysInventory.set(errorLoadState(runtimeError));
    summarizeOperationFailure(m.credential_inventory(), runtimeError, "passkeys-inventory", () => loadPasskeys());
    applyInvalidSessionError(runtimeError);
  } finally {
    const current = get(passkeysInventory);
    if (current.state === "loading") passkeysInventory.set(idleLoadState());
  }
}
