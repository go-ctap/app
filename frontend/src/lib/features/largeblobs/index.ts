import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "../../authenticator-controller.js";
import {
  beginLargeBlobCleanup as beginLargeBlobCleanupOperation,
  beginLargeBlobDelete as beginLargeBlobDeleteOperation,
  loadLargeBlobs as loadLargeBlobsOperation,
  previewLargeBlobWrite as previewLargeBlobWriteOperation,
} from "../../largeblobs-controller.js";
import * as state from "./state.js";

export const largeBlobsInventoryState = readonly(state.largeBlobsInventoryState);
export const largeBlobsDecodeMode = readonly(state.largeBlobsDecodeMode);
export const largeBlobsReadState = readonly(state.largeBlobsReadState);
export const largeBlobsMutation = readonly(state.largeBlobsMutation);
export const largeBlobsQuery = readonly(state.largeBlobsQuery);
export const largeBlobsStatusFilter = readonly(state.largeBlobsStatusFilter);
export const largeBlobsSelectedCredentialID = readonly(state.largeBlobsSelectedCredentialID);
export const largeBlobsVerificationFlow = readonly(state.largeBlobsVerificationFlow);
export const largeBlobsPayloadEncoding = readonly(state.largeBlobsPayloadEncoding);

export type {
  LargeBlobMutationState,
  LargeBlobReadState,
  LargeBlobsInventoryPhase,
  LargeBlobsInventoryState,
  LargeBlobsStatusFilter,
} from "./state.js";
export type { LargeBlobPayloadEncoding } from "../../largeblobs-payload.js";

export async function reloadLargeBlobs(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadLargeBlobsOperation();
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return previewLargeBlobWriteOperation();
}

export async function beginLargeBlobDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginLargeBlobDeleteOperation(credentialIDHex);
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginLargeBlobCleanupOperation();
}

export { loadLargeBlobsOperation as loadLargeBlobs };

export {
  beginLargeBlobWrite,
  closeLargeBlobMutation,
  confirmLargeBlobCleanup,
  confirmLargeBlobDelete,
  confirmLargeBlobWrite,
  editLargeBlobWrite,
  readLargeBlob,
  selectLargeBlobCredential,
  setLargeBlobsDecodeMode,
  setLargeBlobsPayloadEncoding,
  setLargeBlobsQuery,
  setLargeBlobsStatusFilter,
  setLargeBlobsVerificationFlow,
  updateLargeBlobWriteDraft,
} from "../../largeblobs-controller.js";
