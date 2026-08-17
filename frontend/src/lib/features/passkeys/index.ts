import { readonly } from "svelte/store";

import {
  beginCredentialDelete as beginCredentialDeleteOperation,
  loadPasskeys as loadPasskeysOperation,
  previewCredentialUpdate as previewCredentialUpdateOperation,
} from "$lib/passkeys-controller.js";
import * as state from "$lib/features/passkeys/state.js";

export const passkeysInventoryState = readonly(state.passkeysInventoryState);

export const passkeyDirectoryState = readonly(state.passkeyDirectoryState);

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

export {
  beginCredentialDeleteOperation as beginCredentialDelete,
  loadPasskeysOperation as loadPasskeys,
  loadPasskeysOperation as reloadPasskeys,
  previewCredentialUpdateOperation as previewCredentialUpdate,
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
} from "$lib/passkeys-controller.js";
