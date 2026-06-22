import { get } from "svelte/store";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { CredentialsEnvelope, RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api, type OperationEnvelope } from "./api.js";
import {
  beginPasskeysEpoch,
  bumpPasskeysEpoch,
  isCurrentPasskeysEpoch,
} from "./controller-epochs.js";
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
import { beginOperation, summarizeEnvelope } from "./workbench-state.js";

function failureEnvelope(error: RuntimeErrorEnvelope): OperationEnvelope {
  return new CredentialsEnvelope({ kind: OperationKind.OperationListCredentials, error });
}

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
  await loadPasskeys(get(selectedSelector));
}

export function invalidatePasskeysLoads() {
  bumpPasskeysEpoch();
}

export async function loadPasskeys(selector = get(selectedSelector)) {
  selector = selector.trim();
  if (!selector) {
    passkeysInventory.set(idleLoadState());
    return;
  }

  const epoch = beginPasskeysEpoch();
  passkeysInventory.set(loadingLoadState(get(passkeysInventory).data));
  try {
    beginOperation(m.credential_inventory(), "passkeys-inventory");
    const envelope = await api.listCredentials({ sessionId: selectedSessionId() });
    if (!isCurrentPasskeysEpoch(epoch) || selector !== get(selectedSelector)) return;
    if (envelope.error) {
      passkeysInventory.set(errorLoadState(envelope.error, envelope));
    } else {
      passkeysInventory.set(readyLoadState(envelope));
    }
    summarizeEnvelope(m.credential_inventory(), envelope, "passkeys-inventory", () => loadPasskeys(selector));
    applyInvalidSessionError(envelope.error);
  } catch (error) {
    if (isCurrentPasskeysEpoch(epoch) && selector === get(selectedSelector)) {
      const runtimeError = runtimeErrorFrom(error);
      const envelope = failureEnvelope(runtimeError);
      passkeysInventory.set(errorLoadState(runtimeError, envelope));
      summarizeEnvelope(m.credential_inventory(), envelope, "passkeys-inventory", () => loadPasskeys(selector));
      applyInvalidSessionError(envelope.error);
    }
  } finally {
    if (isCurrentPasskeysEpoch(epoch)) {
      const current = get(passkeysInventory);
      if (current.state === "loading") passkeysInventory.set(idleLoadState());
    }
  }
}
