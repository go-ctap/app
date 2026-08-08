import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/telesma-app/kit";
import type {
  CredentialTarget,
  InventoryReport,
} from "../../../../bindings/github.com/telesma-app/kit/model/credentials";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
} from "../../../../bindings/telesma/service";

import {
  idleConfirmedOperation,
  type ConfirmableMutation,
  type ConfirmedOperationIdle,
  type NonEditableConfirmedMutation,
} from "$lib/confirmed-operation";
import {
  beginRetainedInventoryLoad,
  completeRetainedInventoryLoad,
  emptyRetainedInventoryState,
  failRetainedInventoryLoad,
  retainedInventoryIsStale,
  type RetainedInventoryPhase,
  type RetainedInventoryState,
} from "$lib/retained-inventory-state";

export type PasskeysInventoryPhase = RetainedInventoryPhase;

/** Retains the last-known-good generated report while a forced refresh fails. */
export type PasskeysInventoryState = RetainedInventoryState<InventoryReport>;

export function passkeysInventoryIsStale(state: PasskeysInventoryState) {
  return retainedInventoryIsStale(state);
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
  | { kind: "idle"; operation: ConfirmedOperationIdle }
  | ConfirmableMutation<
      UpdateMutationBase,
      CredentialUpdateRequest,
      CredentialUpdateEnvelope,
      CredentialUpdateValidationError
    >
  | NonEditableConfirmedMutation<
      DeleteMutationBase,
      CredentialDeleteRequest,
      CredentialDeleteEnvelope
    >;

export function emptyPasskeysInventoryState(): PasskeysInventoryState {
  return emptyRetainedInventoryState();
}

export const passkeysInventoryState = writable<PasskeysInventoryState>(
  emptyPasskeysInventoryState(),
);

export const passkeysQuery = writable("");

export const passkeysStatusFilter = writable<PasskeysStatusFilter>("all");

export const passkeysSelectedCredentialID = writable("");

export const passkeysVerificationFlow = writable<VerificationFlow>(
  VerificationFlow.VerificationFlowDefault,
);

export const passkeysMutation = writable<PasskeysMutationState>({
  kind: "idle",
  operation: idleConfirmedOperation(),
});

export function beginPasskeysInventoryLoad() {
  passkeysInventoryState.update(beginRetainedInventoryLoad);
}

export function completePasskeysInventoryLoad(report: InventoryReport, completedAt: string) {
  passkeysInventoryState.set(completeRetainedInventoryLoad(report, completedAt));
}

export function failPasskeysInventoryLoadWithResponse(unsupported: boolean) {
  passkeysInventoryState.update((current) => failRetainedInventoryLoad(current, unsupported));
}

export function failPasskeysInventoryLoadAtRuntime() {
  passkeysInventoryState.update((current) => failRetainedInventoryLoad(current));
}

/** Clears state owned by one selected authenticator but keeps the in-memory UV preference. */
export function resetPasskeysDeviceState() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  passkeysQuery.set("");
  passkeysStatusFilter.set("all");
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidatePasskeysInventory() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
}

export function resetPasskeysStateForTest() {
  resetPasskeysDeviceState();
  passkeysVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
}
