import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";
import { Code, type Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
  CredentialsEnvelope,
} from "../../../../bindings/telesma/service";

import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import {
  beginInventoryLoad,
  completeInventoryLoad,
  emptyInventoryState,
  failInventoryLoadAtRuntime,
  failInventoryLoadWithResponse,
  inventoryIsStale,
  type InventoryPhase,
  type InventoryState,
} from "$lib/inventory-state";
import {
  idleMutation,
  type EditableMutationLifecycle,
  type MutationFailureReason,
  type MutationIdleState,
  type MutationLifecycle,
} from "$lib/mutation-lifecycle";

export type PasskeysInventoryPhase = InventoryPhase;
export type CredentialStoreStatePhase = "idle" | "loading" | "ready" | "error" | "unsupported";

/**
 * Passkeys keeps the last-known-good inventory separate from the response to the
 * latest attempt. This lets the UI stay useful after a failed forced refresh
 * without mistaking an errored service envelope for usable data.
 */
export type PasskeysInventoryState = InventoryState<CredentialsEnvelope>;

export type CredentialStoreStateState = {
  phase: CredentialStoreStatePhase;
  responseEnvelope: CredentialStoreStateEnvelope | null;
  runtimeError: Failure | null;
};

export function passkeysInventoryIsStale(state: PasskeysInventoryState) {
  return inventoryIsStale(state);
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
export type PasskeysMutationFailureReason = MutationFailureReason;

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
  | MutationIdleState
  | EditableMutationLifecycle<
      UpdateMutationBase,
      CredentialUpdateRequest,
      CredentialUpdateEnvelope,
      CredentialUpdateValidationError
    >
  | MutationLifecycle<
      DeleteMutationBase,
      CredentialDeleteRequest,
      CredentialDeleteEnvelope
    >;

export function emptyPasskeysInventoryState(): PasskeysInventoryState {
  return emptyInventoryState();
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
export const passkeysMutation = writable<PasskeysMutationState>(idleMutation());

export function beginPasskeysInventoryLoad() {
  passkeysInventoryState.update(beginInventoryLoad);
}

export function completePasskeysInventoryLoad(envelope: CredentialsEnvelope, completedAt: string) {
  passkeysInventoryState.set(completeInventoryLoad(envelope, completedAt));
}

export function failPasskeysInventoryLoadWithResponse(envelope: CredentialsEnvelope) {
  passkeysInventoryState.update((current) => failInventoryLoadWithResponse(
    current,
    envelope,
    envelope.error?.code === Code.CodeCredentialManagementUnsupported,
  ));
}

export function failPasskeysInventoryLoadAtRuntime(error: Failure) {
  passkeysInventoryState.update((current) => failInventoryLoadAtRuntime(current, error));
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
  passkeysMutation.set(idleMutation());
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidatePasskeysInventory() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  credentialStoreStateState.set(emptyCredentialStoreStateState());
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set(idleMutation());
}

export function resetPasskeysStateForTest() {
  resetPasskeysDeviceState();
  passkeysVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
}

deviceFeatureLifecycles.register("passkeys", {
  resetForAuthenticatorChange: resetPasskeysDeviceState,
  resetForTest: resetPasskeysStateForTest,
});
