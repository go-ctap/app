import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";
import type { Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  CredentialTarget,
  InventoryReport,
} from "../../../../bindings/github.com/go-ctap/kit/model/credentials";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
} from "../../../../bindings/telesma/service";

import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import {
  idleMutation,
  type EditableMutationLifecycle,
  type MutationFailureReason,
  type MutationIdleState,
  type MutationLifecycle,
} from "$lib/mutation-lifecycle";

export type PasskeysInventoryPhase = "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";
export type CredentialStoreStatePhase = "idle" | "loading" | "ready" | "error" | "unsupported";

/** Retains the last-known-good generated report while a forced refresh fails. */
export type PasskeysInventoryState = {
  phase: PasskeysInventoryPhase;
  report: InventoryReport | null;
  lastSuccessfulAt: string | null;
};

export type CredentialStoreStateState = {
  phase: CredentialStoreStatePhase;
  responseEnvelope: CredentialStoreStateEnvelope | null;
  runtimeError: Failure | null;
};

export function passkeysInventoryIsStale(state: PasskeysInventoryState) {
  return Boolean(state.report)
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
  name: string;
  displayName: string;
};

export type CredentialUpdateValidationError = "no-changes";
export type PasskeysMutationFailureReason = MutationFailureReason;

type UpdateMutationBase = {
  kind: "update";
  target: CredentialTarget;
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
  return {
    phase: "idle",
    report: null,
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
export const passkeysMutation = writable<PasskeysMutationState>(idleMutation());

export function beginPasskeysInventoryLoad() {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: current.report ? "refreshing" : "loading",
  }));
}

export function completePasskeysInventoryLoad(report: InventoryReport, completedAt: string) {
  passkeysInventoryState.set({
    phase: "ready",
    report,
    lastSuccessfulAt: completedAt,
  });
}

export function failPasskeysInventoryLoadWithResponse(unsupported: boolean) {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: unsupported ? "unsupported" : "error",
  }));
}

export function failPasskeysInventoryLoadAtRuntime() {
  passkeysInventoryState.update((current) => ({
    ...current,
    phase: "error",
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
