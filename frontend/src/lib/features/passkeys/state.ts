import { writable } from "svelte/store";

import { ErrorCategory, VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
  CredentialsEnvelope,
  RuntimeErrorEnvelope,
} from "../../../../bindings/github.com/go-ctap/kit/service";

export type PasskeysInventoryPhase = "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";

/**
 * Passkeys keeps the last-known-good inventory separate from the response to the
 * latest attempt. This lets the UI stay useful after a failed forced refresh
 * without mistaking an errored service envelope for usable data.
 */
export type PasskeysInventoryState = {
  phase: PasskeysInventoryPhase;
  lastSuccessfulEnvelope: CredentialsEnvelope | null;
  responseEnvelope: CredentialsEnvelope | null;
  runtimeError: RuntimeErrorEnvelope | null;
  stale: boolean;
  lastSuccessfulAt: string | null;
};

export type PasskeysStatusFilter =
  | "all"
  | "large-blob-available"
  | "large-blob-missing"
  | "third-party-payment"
  | "cred-protect-1"
  | "cred-protect-2"
  | "cred-protect-3"
  | "cred-protect-not-reported";

export type CredentialUpdateForm = {
  userIDHex: string;
  name: string;
  displayName: string;
};

export type CredentialUpdateValidationError = "user-id-required" | "user-id-invalid-hex" | "no-changes";
export type PasskeysMutationFailureReason = "response-error" | "runtime-error" | "missing-preview" | "missing-result";

type UpdateMutationBase = {
  kind: "update";
  credentialIDHex: string;
  original: CredentialUpdateForm;
  form: CredentialUpdateForm;
};

type DeleteMutationBase = {
  kind: "delete";
  credentialIDHex: string;
};

export type PasskeysMutationState =
  | { kind: "idle"; phase: "idle" }
  | (UpdateMutationBase & {
      phase: "editing";
      validationError: CredentialUpdateValidationError | null;
    })
  | (UpdateMutationBase & {
      phase: "previewing";
      previewRequest: CredentialUpdateRequest;
    })
  | (UpdateMutationBase & {
      phase: "review";
      previewRequest: CredentialUpdateRequest;
      previewEnvelope: CredentialUpdateEnvelope;
      responseEnvelope: CredentialUpdateEnvelope;
    })
  | (UpdateMutationBase & {
      phase: "executing";
      previewRequest: CredentialUpdateRequest;
      previewEnvelope: CredentialUpdateEnvelope;
      responseEnvelope: null;
    })
  | (UpdateMutationBase & {
      phase: "error";
      failedPhase: "previewing" | "executing";
      previewRequest: CredentialUpdateRequest | null;
      previewEnvelope: CredentialUpdateEnvelope | null;
      responseEnvelope: CredentialUpdateEnvelope | null;
      runtimeError: RuntimeErrorEnvelope | null;
      failureReason: PasskeysMutationFailureReason;
      validationError: CredentialUpdateValidationError | null;
    })
  | (DeleteMutationBase & {
      phase: "previewing";
      previewRequest: CredentialDeleteRequest;
    })
  | (DeleteMutationBase & {
      phase: "review";
      previewRequest: CredentialDeleteRequest;
      previewEnvelope: CredentialDeleteEnvelope;
      responseEnvelope: CredentialDeleteEnvelope;
    })
  | (DeleteMutationBase & {
      phase: "executing";
      previewRequest: CredentialDeleteRequest;
      previewEnvelope: CredentialDeleteEnvelope;
      responseEnvelope: null;
    })
  | (DeleteMutationBase & {
      phase: "error";
      failedPhase: "previewing" | "executing";
      previewRequest: CredentialDeleteRequest | null;
      previewEnvelope: CredentialDeleteEnvelope | null;
      responseEnvelope: CredentialDeleteEnvelope | null;
      runtimeError: RuntimeErrorEnvelope | null;
      failureReason: PasskeysMutationFailureReason;
    });

export function emptyPasskeysInventoryState(): PasskeysInventoryState {
  return {
    phase: "idle",
    lastSuccessfulEnvelope: null,
    responseEnvelope: null,
    runtimeError: null,
    stale: false,
    lastSuccessfulAt: null,
  };
}

function inventoryState(
  phase: PasskeysInventoryPhase,
  lastSuccessfulEnvelope: CredentialsEnvelope | null,
  responseEnvelope: CredentialsEnvelope | null,
  runtimeError: RuntimeErrorEnvelope | null,
  stale: boolean,
  lastSuccessfulAt: string | null,
): PasskeysInventoryState {
  return {
    phase,
    lastSuccessfulEnvelope,
    responseEnvelope,
    runtimeError,
    stale,
    lastSuccessfulAt,
  };
}

export const passkeysInventoryState = writable<PasskeysInventoryState>(emptyPasskeysInventoryState());

export const passkeysQuery = writable("");
export const passkeysStatusFilter = writable<PasskeysStatusFilter>("all");
export const passkeysSelectedCredentialID = writable("");
export const passkeysVerificationFlow = writable<VerificationFlow>(VerificationFlow.VerificationFlowDefault);
export const passkeysMutation = writable<PasskeysMutationState>({ kind: "idle", phase: "idle" });

export function beginPasskeysInventoryLoad() {
  passkeysInventoryState.update((current) => inventoryState(
    current.lastSuccessfulEnvelope ? "refreshing" : "loading",
    current.lastSuccessfulEnvelope,
    null,
    null,
    current.stale,
    current.lastSuccessfulAt,
  ));
}

export function completePasskeysInventoryLoad(envelope: CredentialsEnvelope, completedAt: string) {
  passkeysInventoryState.set(inventoryState("ready", envelope, envelope, null, false, completedAt));
}

export function failPasskeysInventoryLoadWithResponse(envelope: CredentialsEnvelope) {
  passkeysInventoryState.update((current) => inventoryState(
    envelope.error?.category === ErrorCategory.ErrorUnsupported ? "unsupported" : "error",
    current.lastSuccessfulEnvelope,
    envelope,
    null,
    Boolean(current.lastSuccessfulEnvelope),
    current.lastSuccessfulAt,
  ));
}

export function failPasskeysInventoryLoadAtRuntime(error: RuntimeErrorEnvelope) {
  passkeysInventoryState.update((current) => inventoryState(
    "error",
    current.lastSuccessfulEnvelope,
    null,
    error,
    Boolean(current.lastSuccessfulEnvelope),
    current.lastSuccessfulAt,
  ));
}

/** Clears state owned by one selected authenticator but keeps the in-memory UV preference. */
export function resetPasskeysDeviceState() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  passkeysQuery.set("");
  passkeysStatusFilter.set("all");
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", phase: "idle" });
}

export function resetPasskeysStateForTest() {
  resetPasskeysDeviceState();
  passkeysVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
}
