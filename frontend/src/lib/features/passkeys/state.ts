import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
import { Code, type Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
  CredentialsEnvelope,
} from "../../../../bindings/fidobench/service";

export type PasskeysInventoryPhase = "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";
export type CredentialStoreStatePhase = "idle" | "loading" | "ready" | "error" | "unsupported";

/**
 * Passkeys keeps the last-known-good inventory separate from the response to the
 * latest attempt. This lets the UI stay useful after a failed forced refresh
 * without mistaking an errored service envelope for usable data.
 */
export type PasskeysInventoryState = {
  phase: PasskeysInventoryPhase;
  lastSuccessfulEnvelope: CredentialsEnvelope | null;
  responseEnvelope: CredentialsEnvelope | null;
  runtimeError: Failure | null;
  lastSuccessfulAt: string | null;
};

export type CredentialStoreStateState = {
  phase: CredentialStoreStatePhase;
  responseEnvelope: CredentialStoreStateEnvelope | null;
  runtimeError: Failure | null;
};

export function passkeysInventoryIsStale(state: PasskeysInventoryState) {
  return Boolean(state.lastSuccessfulEnvelope)
    && (state.phase === "error" || state.phase === "unsupported");
}

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
    })
  | (UpdateMutationBase & {
      phase: "executing";
      previewRequest: CredentialUpdateRequest;
      previewEnvelope: CredentialUpdateEnvelope;
    })
  | (UpdateMutationBase & {
      phase: "error";
      failedPhase: "previewing" | "executing";
      previewRequest: CredentialUpdateRequest | null;
      previewEnvelope: CredentialUpdateEnvelope | null;
      responseEnvelope: CredentialUpdateEnvelope | null;
      runtimeError: Failure | null;
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
    })
  | (DeleteMutationBase & {
      phase: "executing";
      previewRequest: CredentialDeleteRequest;
      previewEnvelope: CredentialDeleteEnvelope;
    })
  | (DeleteMutationBase & {
      phase: "error";
      failedPhase: "previewing" | "executing";
      previewRequest: CredentialDeleteRequest | null;
      previewEnvelope: CredentialDeleteEnvelope | null;
      responseEnvelope: CredentialDeleteEnvelope | null;
      runtimeError: Failure | null;
      failureReason: PasskeysMutationFailureReason;
    });

export function emptyPasskeysInventoryState(): PasskeysInventoryState {
  return {
    phase: "idle",
    lastSuccessfulEnvelope: null,
    responseEnvelope: null,
    runtimeError: null,
    lastSuccessfulAt: null,
  };
}

export function emptyCredentialStoreStateState(): CredentialStoreStateState {
  return {
    phase: "idle",
    responseEnvelope: null,
    runtimeError: null,
  };
}

export const passkeysInventoryState = writable<PasskeysInventoryState>(emptyPasskeysInventoryState());
export const credentialStoreStateState = writable<CredentialStoreStateState>(emptyCredentialStoreStateState());

export const passkeysQuery = writable("");
export const passkeysStatusFilter = writable<PasskeysStatusFilter>("all");
export const passkeysSelectedCredentialID = writable("");
export const passkeysVerificationFlow = writable<VerificationFlow>(VerificationFlow.VerificationFlowDefault);
export const passkeysMutation = writable<PasskeysMutationState>({ kind: "idle", phase: "idle" });

export function beginPasskeysInventoryLoad() {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: current.lastSuccessfulEnvelope ? "refreshing" : "loading",
    responseEnvelope: null,
    runtimeError: null,
  }));
}

export function completePasskeysInventoryLoad(envelope: CredentialsEnvelope, completedAt: string) {
  passkeysInventoryState.set({
    phase: "ready",
    lastSuccessfulEnvelope: envelope,
    responseEnvelope: envelope,
    runtimeError: null,
    lastSuccessfulAt: completedAt,
  });
}

export function failPasskeysInventoryLoadWithResponse(envelope: CredentialsEnvelope) {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: envelope.error?.code === Code.CodeCredentialManagementUnsupported ? "unsupported" : "error",
    responseEnvelope: envelope,
    runtimeError: null,
  }));
}

export function failPasskeysInventoryLoadAtRuntime(error: Failure) {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: "error",
    responseEnvelope: null,
    runtimeError: error,
  }));
}

export function beginCredentialStoreStateLoad() {
  credentialStoreStateState.set({
    phase: "loading",
    responseEnvelope: null,
    runtimeError: null,
  });
}

export function completeCredentialStoreStateLoad(envelope: CredentialStoreStateEnvelope) {
  credentialStoreStateState.set({
    phase: "ready",
    responseEnvelope: envelope,
    runtimeError: null,
  });
}

export function failCredentialStoreStateLoadWithResponse(envelope: CredentialStoreStateEnvelope) {
  credentialStoreStateState.set({
    phase: envelope.error?.category === "unsupported" ? "unsupported" : "error",
    responseEnvelope: envelope,
    runtimeError: null,
  });
}

export function failCredentialStoreStateLoadAtRuntime(error: Failure) {
  credentialStoreStateState.set({
    phase: "error",
    responseEnvelope: null,
    runtimeError: error,
  });
}

export function failCredentialStoreStateLoadWithContractError(
  envelope: CredentialStoreStateEnvelope,
  error: Failure,
) {
  credentialStoreStateState.set({
    phase: "error",
    responseEnvelope: envelope,
    runtimeError: error,
  });
}

/** Clears state owned by one selected authenticator but keeps the in-memory UV preference. */
export function resetPasskeysDeviceState() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  credentialStoreStateState.set(emptyCredentialStoreStateState());
  passkeysQuery.set("");
  passkeysStatusFilter.set("all");
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", phase: "idle" });
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidatePasskeysInventory() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  credentialStoreStateState.set(emptyCredentialStoreStateState());
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", phase: "idle" });
}

export function resetPasskeysStateForTest() {
  resetPasskeysDeviceState();
  passkeysVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
}
