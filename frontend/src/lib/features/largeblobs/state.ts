import { writable } from "svelte/store";

import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";
import { Code, type Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import { DecodeMode } from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobGarbageCollectRequest,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobMutationRequest,
  LargeBlobReadEnvelope,
  LargeBlobReadRequest,
} from "../../../../bindings/telesma/service";

import type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "$lib/largeblobs-payload";
import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import {
  beginInventoryLoad,
  completeInventoryLoad,
  emptyInventoryState,
  failInventoryLoadAtRuntime,
  failInventoryLoadWithResponse,
  inventoryIsStale,
  type InventoryPhase,
  type InventoryState,
} from "$lib/inventory-state";
import {
  idleMutation,
  type EditableMutationLifecycle,
  type MutationFailureReason,
  type MutationIdleState,
  type MutationLifecycle,
} from "$lib/mutation-lifecycle";

export type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "../../largeblobs-payload.js";

export type LargeBlobsInventoryPhase = InventoryPhase;

/** The latest successful list stays visible when a later refresh fails. */
export type LargeBlobsInventoryState = InventoryState<LargeBlobListEnvelope>;

export function largeBlobsInventoryIsStale(state: LargeBlobsInventoryState) {
  return inventoryIsStale(state);
}

export type LargeBlobsStatusFilter = "all" | "present" | "missing" | "key-unavailable";

export type LargeBlobReadFailureReason = "response-error" | "runtime-error" | "missing-result";

export type LargeBlobReadState =
  | { phase: "idle" }
  | {
      phase: "loading";
      credentialIDHex: string;
      request: LargeBlobReadRequest;
    }
  | {
      phase: "ready";
      credentialIDHex: string;
      request: LargeBlobReadRequest;
      responseEnvelope: LargeBlobReadEnvelope;
    }
  | {
      phase: "error";
      credentialIDHex: string;
      request: LargeBlobReadRequest | null;
      responseEnvelope: LargeBlobReadEnvelope | null;
      runtimeError: Failure | null;
      failureReason: LargeBlobReadFailureReason;
    };

export type LargeBlobWriteDraft = {
  payload: string;
  encoding: LargeBlobPayloadEncoding;
};

export type LargeBlobMutationFailureReason = MutationFailureReason;

type WriteMutationBase = {
  kind: "write";
  credentialIDHex: string;
  draft: LargeBlobWriteDraft;
};

type DeleteMutationBase = {
  kind: "delete";
  credentialIDHex: string;
};

type CleanupMutationBase = {
  kind: "cleanup";
};

export type LargeBlobMutationState =
  | MutationIdleState
  | EditableMutationLifecycle<
      WriteMutationBase,
      LargeBlobMutationRequest,
      LargeBlobMutationEnvelope,
      LargeBlobPayloadValidationError
    >
  | MutationLifecycle<
      DeleteMutationBase,
      LargeBlobMutationRequest,
      LargeBlobMutationEnvelope
    >
  | MutationLifecycle<
      CleanupMutationBase,
      LargeBlobGarbageCollectRequest,
      LargeBlobMutationEnvelope
    >;

export function emptyLargeBlobsInventoryState(): LargeBlobsInventoryState {
  return emptyInventoryState();
}

export const largeBlobsInventoryState = writable<LargeBlobsInventoryState>(emptyLargeBlobsInventoryState());
export const largeBlobsReadState = writable<LargeBlobReadState>({ phase: "idle" });
export const largeBlobsMutation = writable<LargeBlobMutationState>(idleMutation());
export const largeBlobsQuery = writable("");
export const largeBlobsStatusFilter = writable<LargeBlobsStatusFilter>("all");
export const largeBlobsSelectedCredentialID = writable("");
export const largeBlobsVerificationFlow = writable<VerificationFlow>(VerificationFlow.VerificationFlowDefault);
export const largeBlobsPayloadEncoding = writable<LargeBlobPayloadEncoding>("utf8");
export const largeBlobsDecodeMode = writable<DecodeMode>(DecodeMode.DecodeModeJSON);

export function beginLargeBlobsInventoryLoad() {
  largeBlobsInventoryState.update(beginInventoryLoad);
}

export function completeLargeBlobsInventoryLoad(envelope: LargeBlobListEnvelope, completedAt: string) {
  largeBlobsInventoryState.set(completeInventoryLoad(envelope, completedAt));
}

export function failLargeBlobsInventoryLoadWithResponse(envelope: LargeBlobListEnvelope) {
  largeBlobsInventoryState.update((current) => failInventoryLoadWithResponse(
    current,
    envelope,
    envelope.error?.code === Code.CodeLargeBlobUnsupported,
  ));
}

export function failLargeBlobsInventoryLoadAtRuntime(error: Failure) {
  largeBlobsInventoryState.update((current) => failInventoryLoadAtRuntime(current, error));
}

export function resetLargeBlobReadState() {
  largeBlobsReadState.set({ phase: "idle" });
}

/** Clears state owned by one authenticator while preserving UI preferences. */
export function resetLargeBlobsDeviceState() {
  largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
  resetLargeBlobReadState();
  largeBlobsMutation.set(idleMutation());
  largeBlobsQuery.set("");
  largeBlobsStatusFilter.set("all");
  largeBlobsSelectedCredentialID.set("");
}

/** Invalidates authenticator-backed inventory while retaining every UI preference. */
export function invalidateLargeBlobsInventory() {
  largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
  resetLargeBlobReadState();
  largeBlobsMutation.set(idleMutation());
  largeBlobsSelectedCredentialID.set("");
}

export function resetLargeBlobsStateForTest() {
  resetLargeBlobsDeviceState();
  largeBlobsVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
  largeBlobsPayloadEncoding.set("utf8");
  largeBlobsDecodeMode.set(DecodeMode.DecodeModeJSON);
}

deviceFeatureLifecycles.register("large-blobs", {
  resetForAuthenticatorChange: resetLargeBlobsDeviceState,
  resetForTest: resetLargeBlobsStateForTest,
});
