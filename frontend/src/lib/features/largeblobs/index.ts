import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "$lib/authenticator-controller.js";
import {
  beginLargeBlobCleanup as beginLargeBlobCleanupOperation,
  beginLargeBlobDelete as beginLargeBlobDeleteOperation,
  loadLargeBlobs as loadLargeBlobsOperation,
  previewLargeBlobWrite as previewLargeBlobWriteOperation,
} from "$lib/largeblobs-controller.js";
import * as state from "$lib/features/largeblobs/state.js";

export const largeBlobsInventoryState = readonly(state.largeBlobsInventoryState);

export const largeBlobsDecodeMode = readonly(state.largeBlobsDecodeMode);

export const largeBlobsDecodeState = readonly(state.largeBlobsDecodeState);

export const largeBlobsReadState = readonly(state.largeBlobsReadState);

export const largeBlobsMutation = readonly(state.largeBlobsMutation);

export const largeBlobsQuery = readonly(state.largeBlobsQuery);

export const largeBlobsStatusFilter = readonly(state.largeBlobsStatusFilter);

export const largeBlobsSelectedEntryIndex = readonly(state.largeBlobsSelectedEntryIndex);

export const largeBlobsVerificationFlow = readonly(state.largeBlobsVerificationFlow);

export type {
  LargeBlobDecodeState,
  LargeBlobMutationState,
  LargeBlobReadState,
  LargeBlobsInventoryPhase,
  LargeBlobsInventoryState,
  LargeBlobsStatusFilter,
} from "$lib/features/largeblobs/state.js";
export type { LargeBlobPayloadEncoding } from "$lib/largeblobs-payload.js";

export async function reloadLargeBlobs(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return loadLargeBlobsOperation();
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return previewLargeBlobWriteOperation();
}

export async function beginLargeBlobDelete(entryIndex?: number): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return beginLargeBlobDeleteOperation(entryIndex);
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

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
  selectLargeBlobEntry,
  setLargeBlobsDecodeMode,
  setLargeBlobsPayloadEncoding,
  setLargeBlobsQuery,
  setLargeBlobsStatusFilter,
  setLargeBlobsVerificationFlow,
  updateLargeBlobWriteDraft,
} from "$lib/largeblobs-controller.js";
