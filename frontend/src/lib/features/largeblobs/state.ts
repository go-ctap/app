import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";
import { Code, type Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import {
  DecodeMode,
  type DecodeResult,
  type ListReport,
} from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobDecodeEnvelope,
  LargeBlobGarbageCollectRequest,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobDeleteRequest,
  LargeBlobReadEnvelope,
  LargeBlobWriteRequest,
} from "../../../../bindings/telesma/service";

import type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "$lib/largeblobs-payload";
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

export type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "$lib/largeblobs-payload.js";

export type LargeBlobsInventoryPhase = RetainedInventoryPhase;

/** The latest successful list stays visible when a later refresh fails. */
export type LargeBlobsInventoryState = RetainedInventoryState<ListReport>;

export function largeBlobsInventoryIsStale(state: LargeBlobsInventoryState) {
  return retainedInventoryIsStale(state);
}

export type LargeBlobsStatusFilter = "all" | "matched" | "orphaned" | "nonconforming" | "corrupt";

export type LargeBlobReadState =
  | { phase: "idle" }
  | {
      phase: "loading";
      entryIndex: number;
    }
  | {
      phase: "ready";
      entryIndex: number;
      responseEnvelope: LargeBlobReadEnvelope;
    }
  | {
      phase: "error";
      entryIndex: number;
      responseEnvelope: LargeBlobReadEnvelope | null;
      runtimeError: Failure | null;
    };

export type LargeBlobDecodeState =
  | { phase: "idle" }
  | { phase: "loading"; entryIndex: number; mode: DecodeMode }
  | {
      phase: "ready";
      entryIndex: number;
      mode: DecodeMode;
      responseEnvelope: LargeBlobDecodeEnvelope;
      value: DecodeResult;
    }
  | {
      phase: "error";
      entryIndex: number;
      mode: DecodeMode;
      responseEnvelope: LargeBlobDecodeEnvelope | null;
      runtimeError: Failure | null;
    };

export type LargeBlobWriteDraft = {
  payload: string;
  encoding: LargeBlobPayloadEncoding;
};

type WriteMutationBase = {
  kind: "write";
  entryIndex: number;
  credentialIDHex: string;
  draft: LargeBlobWriteDraft;
};

type DeleteMutationBase = {
  kind: "delete";
  entryIndex: number;
  credentialIDHex: string;
};

type CleanupMutationBase = {
  kind: "cleanup";
};

export type LargeBlobMutationState =
  | { kind: "idle"; operation: ConfirmedOperationIdle }
  | ConfirmableMutation<
      WriteMutationBase,
      LargeBlobWriteRequest,
      LargeBlobMutationEnvelope,
      LargeBlobPayloadValidationError
    >
  | NonEditableConfirmedMutation<
      DeleteMutationBase,
      LargeBlobDeleteRequest,
      LargeBlobMutationEnvelope
    >
  | NonEditableConfirmedMutation<
      CleanupMutationBase,
      LargeBlobGarbageCollectRequest,
      LargeBlobMutationEnvelope
    >;

export function emptyLargeBlobsInventoryState(): LargeBlobsInventoryState {
  return emptyRetainedInventoryState();
}

export const largeBlobsInventoryState = writable<LargeBlobsInventoryState>(
  emptyLargeBlobsInventoryState(),
);

export const largeBlobsReadState = writable<LargeBlobReadState>({ phase: "idle" });

export const largeBlobsDecodeState = writable<LargeBlobDecodeState>({ phase: "idle" });

export const largeBlobsMutation = writable<LargeBlobMutationState>({
  kind: "idle",
  operation: idleConfirmedOperation(),
});

export const largeBlobsQuery = writable("");

export const largeBlobsStatusFilter = writable<LargeBlobsStatusFilter>("all");

export const largeBlobsSelectedEntryIndex = writable<number | null>(null);

export const largeBlobsVerificationFlow = writable<VerificationFlow>(
  VerificationFlow.VerificationFlowDefault,
);

export const largeBlobsPayloadEncoding = writable<LargeBlobPayloadEncoding>("utf8");

export const largeBlobsDecodeMode = writable<DecodeMode>(DecodeMode.DecodeModeJSON);

export function beginLargeBlobsInventoryLoad() {
  largeBlobsInventoryState.update(beginRetainedInventoryLoad);
}

export function completeLargeBlobsInventoryLoad(report: ListReport, completedAt: string) {
  largeBlobsInventoryState.set(completeRetainedInventoryLoad(report, completedAt));
}

export function failLargeBlobsInventoryLoadWithResponse(envelope: LargeBlobListEnvelope) {
  largeBlobsInventoryState.update((current) =>
    failRetainedInventoryLoad(current, envelope.error?.code === Code.CodeLargeBlobUnsupported),
  );
}

export function failLargeBlobsInventoryLoadAtRuntime() {
  largeBlobsInventoryState.update((current) => failRetainedInventoryLoad(current));
}

export function resetLargeBlobReadState() {
  largeBlobsReadState.set({ phase: "idle" });
  largeBlobsDecodeState.set({ phase: "idle" });
}

/** Clears state owned by one authenticator while preserving UI preferences. */
export function resetLargeBlobsDeviceState() {
  largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
  largeBlobsQuery.set("");
  largeBlobsStatusFilter.set("all");
  largeBlobsSelectedEntryIndex.set(null);
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidateLargeBlobsInventory() {
  largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", operation: idleConfirmedOperation() });
  largeBlobsSelectedEntryIndex.set(null);
}

export function resetLargeBlobsStateForTest() {
  resetLargeBlobsDeviceState();
  largeBlobsVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
  largeBlobsPayloadEncoding.set("utf8");
  largeBlobsDecodeMode.set(DecodeMode.DecodeModeJSON);
}
