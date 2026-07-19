import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "../../authenticator-controller.js";
import {
  beginCredentialDelete as beginCredentialDeleteOperation,
  loadCredentialStoreState as loadCredentialStoreStateOperation,
  loadPasskeys as loadPasskeysOperation,
  previewCredentialUpdate as previewCredentialUpdateOperation,
} from "../../passkeys-controller.js";
import * as state from "./state.js";

export const passkeysInventoryState = readonly(state.passkeysInventoryState);
export const credentialStoreStateState = readonly(state.credentialStoreStateState);
export const passkeysQuery = readonly(state.passkeysQuery);
export const passkeysStatusFilter = readonly(state.passkeysStatusFilter);
export const passkeysSelectedCredentialID = readonly(state.passkeysSelectedCredentialID);
export const passkeysVerificationFlow = readonly(state.passkeysVerificationFlow);
export const passkeysMutation = readonly(state.passkeysMutation);

export type {
  CredentialStoreStatePhase,
  CredentialStoreStateState,
  CredentialUpdateForm,
  CredentialUpdateValidationError,
  PasskeysInventoryPhase,
  PasskeysInventoryState,
  PasskeysMutationState,
  PasskeysStatusFilter,
} from "./state.js";

export async function reloadPasskeys(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadPasskeysOperation();
}

export async function readCredentialStoreState(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadCredentialStoreStateOperation();
}

export async function previewCredentialUpdate(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return previewCredentialUpdateOperation();
}

export async function beginCredentialDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginCredentialDeleteOperation(credentialIDHex);
}

export {
  loadCredentialStoreStateOperation as loadCredentialStoreState,
  loadPasskeysOperation as loadPasskeys,
};

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
} from "../../passkeys-controller.js";
