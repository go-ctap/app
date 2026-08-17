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
import type {
  PasskeyDirectoryLookupResult,
  PasskeyDirectoryMatch,
} from "../../../../bindings/telesma/passkeydirectory";

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

type PasskeyDirectoryLookupPhase = "idle" | "loading" | "ready" | "unavailable";

type PasskeyDirectoryState = {
  phase: PasskeyDirectoryLookupPhase;
  matches: ReadonlyMap<string, PasskeyDirectoryMatch>;
};

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

function emptyPasskeyDirectoryState(): PasskeyDirectoryState {
  return {
    phase: "idle",
    matches: new Map(),
  };
}

export const passkeysInventoryState = writable<PasskeysInventoryState>(
  emptyPasskeysInventoryState(),
);

export const passkeyDirectoryState = writable<PasskeyDirectoryState>(emptyPasskeyDirectoryState());

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

let passkeyDirectoryLookupID = 0;

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

export function beginPasskeyDirectoryLookup() {
  const lookupID = ++passkeyDirectoryLookupID;

  passkeyDirectoryState.set({ phase: "loading", matches: new Map() });

  return lookupID;
}

export function completePasskeyDirectoryLookup(
  lookupID: number,
  result: PasskeyDirectoryLookupResult,
) {
  if (lookupID !== passkeyDirectoryLookupID) return;

  passkeyDirectoryState.set({
    phase: "ready",
    matches: new Map(result.matches.map((match) => [normalizedRPID(match.rpID), match])),
  });
}

export function failPasskeyDirectoryLookup(lookupID: number) {
  if (lookupID !== passkeyDirectoryLookupID) return;

  passkeyDirectoryState.set({ phase: "unavailable", matches: new Map() });
}

export function resetPasskeyDirectoryLookup() {
  passkeyDirectoryLookupID++;
  passkeyDirectoryState.set(emptyPasskeyDirectoryState());
}

export function normalizedRPID(rpID: string) {
  return rpID.trim().toLowerCase().replace(/\.$/u, "");
}

/** Clears state owned by one selected authenticator but keeps the in-memory UV preference. */
export function resetPasskeysDeviceState() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  resetPasskeyDirectoryLookup();
  passkeysQuery.set("");
  passkeysStatusFilter.set("all");
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidatePasskeysInventory() {
  passkeysInventoryState.set(emptyPasskeysInventoryState());
  resetPasskeyDirectoryLookup();
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
}

export function resetPasskeysStateForTest() {
  resetPasskeysDeviceState();
  passkeysVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
}
