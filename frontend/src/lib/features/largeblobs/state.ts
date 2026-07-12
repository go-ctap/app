import { writable } from "svelte/store";

import { ErrorCategory, VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
import type {
  LargeBlobGarbageCollectRequest,
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobMutationRequest,
  LargeBlobReadEnvelope,
  LargeBlobReadRequest,
  RuntimeErrorEnvelope,
} from "../../../../bindings/github.com/go-ctap/kit/service";

import type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "../../largeblobs-payload.js";

export type {
  LargeBlobPayloadEncoding,
  LargeBlobPayloadValidationError,
} from "../../largeblobs-payload.js";

export type LargeBlobsInventoryPhase = "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";

/**
 * The latest successful list is retained separately from the latest response.
 * A failed forced refresh can therefore keep its last-known-good rows visible
 * while marking every action as stale.
 */
export type LargeBlobsInventoryState = {
  phase: LargeBlobsInventoryPhase;
  lastSuccessfulEnvelope: LargeBlobListEnvelope | null;
  responseEnvelope: LargeBlobListEnvelope | null;
  runtimeError: RuntimeErrorEnvelope | null;
  stale: boolean;
  lastSuccessfulAt: string | null;
};

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
      runtimeError: RuntimeErrorEnvelope | null;
      failureReason: LargeBlobReadFailureReason;
    };

export type LargeBlobWriteDraft = {
  payload: string;
  encoding: LargeBlobPayloadEncoding;
};

export type LargeBlobMutationFailureReason = "response-error" | "runtime-error" | "missing-preview" | "missing-result";

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

type WriteMutationError = WriteMutationBase & {
  phase: "error";
  failedPhase: "previewing" | "executing";
  previewRequest: LargeBlobMutationRequest | null;
  previewEnvelope: LargeBlobMutationEnvelope | null;
  responseEnvelope: LargeBlobMutationEnvelope | null;
  runtimeError: RuntimeErrorEnvelope | null;
  failureReason: LargeBlobMutationFailureReason;
  validationError: LargeBlobPayloadValidationError | null;
};

type DeleteMutationError = DeleteMutationBase & {
  phase: "error";
  failedPhase: "previewing" | "executing";
  previewRequest: LargeBlobMutationRequest | null;
  previewEnvelope: LargeBlobMutationEnvelope | null;
  responseEnvelope: LargeBlobMutationEnvelope | null;
  runtimeError: RuntimeErrorEnvelope | null;
  failureReason: LargeBlobMutationFailureReason;
};

type CleanupMutationError = CleanupMutationBase & {
  phase: "error";
  failedPhase: "previewing" | "executing";
  previewRequest: LargeBlobGarbageCollectRequest | null;
  previewEnvelope: LargeBlobMutationEnvelope | null;
  responseEnvelope: LargeBlobMutationEnvelope | null;
  runtimeError: RuntimeErrorEnvelope | null;
  failureReason: LargeBlobMutationFailureReason;
};

export type LargeBlobMutationState =
  | { kind: "idle"; phase: "idle" }
  | (WriteMutationBase & {
      phase: "editing";
      validationError: LargeBlobPayloadValidationError | null;
    })
  | (WriteMutationBase & {
      phase: "previewing";
      previewRequest: LargeBlobMutationRequest;
    })
  | (WriteMutationBase & {
      phase: "review";
      previewRequest: LargeBlobMutationRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: LargeBlobMutationEnvelope;
    })
  | (WriteMutationBase & {
      phase: "executing";
      previewRequest: LargeBlobMutationRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: null;
    })
  | WriteMutationError
  | (DeleteMutationBase & {
      phase: "previewing";
      previewRequest: LargeBlobMutationRequest;
    })
  | (DeleteMutationBase & {
      phase: "review" | "noop";
      previewRequest: LargeBlobMutationRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: LargeBlobMutationEnvelope;
    })
  | (DeleteMutationBase & {
      phase: "executing";
      previewRequest: LargeBlobMutationRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: null;
    })
  | DeleteMutationError
  | (CleanupMutationBase & {
      phase: "previewing";
      previewRequest: LargeBlobGarbageCollectRequest;
    })
  | (CleanupMutationBase & {
      phase: "review" | "noop";
      previewRequest: LargeBlobGarbageCollectRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: LargeBlobMutationEnvelope;
    })
  | (CleanupMutationBase & {
      phase: "executing";
      previewRequest: LargeBlobGarbageCollectRequest;
      previewEnvelope: LargeBlobMutationEnvelope;
      responseEnvelope: null;
    })
  | CleanupMutationError;

export function emptyLargeBlobsInventoryState(): LargeBlobsInventoryState {
  return {
    phase: "idle",
    lastSuccessfulEnvelope: null,
    responseEnvelope: null,
    runtimeError: null,
    stale: false,
    lastSuccessfulAt: null,
  };
}

function inventoryState(
  phase: LargeBlobsInventoryPhase,
  lastSuccessfulEnvelope: LargeBlobListEnvelope | null,
  responseEnvelope: LargeBlobListEnvelope | null,
  runtimeError: RuntimeErrorEnvelope | null,
  stale: boolean,
  lastSuccessfulAt: string | null,
): LargeBlobsInventoryState {
  return {
    phase,
    lastSuccessfulEnvelope,
    responseEnvelope,
    runtimeError,
    stale,
    lastSuccessfulAt,
  };
}

export const largeBlobsInventoryState = writable<LargeBlobsInventoryState>(emptyLargeBlobsInventoryState());
export const largeBlobsReadState = writable<LargeBlobReadState>({ phase: "idle" });
export const largeBlobsMutation = writable<LargeBlobMutationState>({ kind: "idle", phase: "idle" });
export const largeBlobsQuery = writable("");
export const largeBlobsStatusFilter = writable<LargeBlobsStatusFilter>("all");
export const largeBlobsSelectedCredentialID = writable("");
export const largeBlobsVerificationFlow = writable<VerificationFlow>(VerificationFlow.VerificationFlowDefault);
export const largeBlobsPayloadEncoding = writable<LargeBlobPayloadEncoding>("utf8");

export function beginLargeBlobsInventoryLoad() {
  largeBlobsInventoryState.update((current) => inventoryState(
    current.lastSuccessfulEnvelope ? "refreshing" : "loading",
    current.lastSuccessfulEnvelope,
    null,
    null,
    current.stale,
    current.lastSuccessfulAt,
  ));
}

export function completeLargeBlobsInventoryLoad(envelope: LargeBlobListEnvelope, completedAt: string) {
  largeBlobsInventoryState.set(inventoryState("ready", envelope, envelope, null, false, completedAt));
}

export function failLargeBlobsInventoryLoadWithResponse(envelope: LargeBlobListEnvelope) {
  largeBlobsInventoryState.update((current) => inventoryState(
    envelope.error?.category === ErrorCategory.ErrorUnsupported ? "unsupported" : "error",
    current.lastSuccessfulEnvelope,
    envelope,
    null,
    Boolean(current.lastSuccessfulEnvelope),
    current.lastSuccessfulAt,
  ));
}

export function failLargeBlobsInventoryLoadAtRuntime(error: RuntimeErrorEnvelope) {
  largeBlobsInventoryState.update((current) => inventoryState(
    "error",
    current.lastSuccessfulEnvelope,
    null,
    error,
    Boolean(current.lastSuccessfulEnvelope),
    current.lastSuccessfulAt,
  ));
}

export function resetLargeBlobReadState() {
  largeBlobsReadState.set({ phase: "idle" });
}

/** Clears state owned by one authenticator while preserving UI preferences. */
export function resetLargeBlobsDeviceState() {
  largeBlobsInventoryState.set(emptyLargeBlobsInventoryState());
  resetLargeBlobReadState();
  largeBlobsMutation.set({ kind: "idle", phase: "idle" });
  largeBlobsQuery.set("");
  largeBlobsStatusFilter.set("all");
  largeBlobsSelectedCredentialID.set("");
}

export function resetLargeBlobsStateForTest() {
  resetLargeBlobsDeviceState();
  largeBlobsVerificationFlow.set(VerificationFlow.VerificationFlowDefault);
  largeBlobsPayloadEncoding.set("utf8");
}
