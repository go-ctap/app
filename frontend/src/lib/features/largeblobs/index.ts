import { readonly } from "svelte/store";

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

export {
  beginLargeBlobCleanupOperation as beginLargeBlobCleanup,
  beginLargeBlobDeleteOperation as beginLargeBlobDelete,
  loadLargeBlobsOperation as loadLargeBlobs,
  loadLargeBlobsOperation as reloadLargeBlobs,
  previewLargeBlobWriteOperation as previewLargeBlobWrite,
};

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
