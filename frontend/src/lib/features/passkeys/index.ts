import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "$lib/authenticator-controller.js";
import {
  beginCredentialDelete as beginCredentialDeleteOperation,
  loadPasskeys as loadPasskeysOperation,
  previewCredentialUpdate as previewCredentialUpdateOperation,
} from "$lib/passkeys-controller.js";
import * as state from "$lib/features/passkeys/state.js";

export const passkeysInventoryState = readonly(state.passkeysInventoryState);

export const passkeysQuery = readonly(state.passkeysQuery);

export const passkeysStatusFilter = readonly(state.passkeysStatusFilter);

export const passkeysSelectedCredentialID = readonly(state.passkeysSelectedCredentialID);

export const passkeysVerificationFlow = readonly(state.passkeysVerificationFlow);

export const passkeysMutation = readonly(state.passkeysMutation);

export type {
  CredentialUpdateForm,
  CredentialUpdateValidationError,
  PasskeysInventoryPhase,
  PasskeysInventoryState,
  PasskeysMutationState,
  PasskeysStatusFilter,
} from "$lib/features/passkeys/state.js";

export async function reloadPasskeys(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return loadPasskeysOperation();
}

export async function previewCredentialUpdate(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return previewCredentialUpdateOperation();
}

export async function beginCredentialDelete(credentialIDHex?: string): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return beginCredentialDeleteOperation(credentialIDHex);
}

export { loadPasskeysOperation as loadPasskeys };

export {
  beginCredentialUpdate,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  editCredentialUpdate,
  selectPasskeyCredential,
  setPasskeysQuery,
  setPasskeysStatusFilter,
  setPasskeysVerificationFlow,
  updateCredentialDraft,
} from "$lib/passkeys-controller.js";
