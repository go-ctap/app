import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

export type InventoryPhase =
  | "idle"
  | "loading"
  | "refreshing"
  | "ready"
  | "error"
  | "unsupported";

export type InventoryState<TEnvelope> = {
  phase: InventoryPhase;
  lastSuccessfulEnvelope: TEnvelope | null;
  responseEnvelope: TEnvelope | null;
  runtimeError: Failure | null;
  lastSuccessfulAt: string | null;
};

export function emptyInventoryState<TEnvelope>(): InventoryState<TEnvelope> {
  return {
    phase: "idle",
    lastSuccessfulEnvelope: null,
    responseEnvelope: null,
    runtimeError: null,
    lastSuccessfulAt: null,
  };
}

export function beginInventoryLoad<TEnvelope>(
  state: InventoryState<TEnvelope>,
): InventoryState<TEnvelope> {
  return {
    ...state,
    phase: state.lastSuccessfulEnvelope ? "refreshing" : "loading",
    responseEnvelope: null,
    runtimeError: null,
  };
}

export function completeInventoryLoad<TEnvelope>(
  envelope: TEnvelope,
  completedAt: string,
): InventoryState<TEnvelope> {
  return {
    phase: "ready",
    lastSuccessfulEnvelope: envelope,
    responseEnvelope: envelope,
    runtimeError: null,
    lastSuccessfulAt: completedAt,
  };
}

export function failInventoryLoadWithResponse<TEnvelope>(
  state: InventoryState<TEnvelope>,
  envelope: TEnvelope,
  unsupported: boolean,
): InventoryState<TEnvelope> {
  return {
    ...state,
    phase: unsupported ? "unsupported" : "error",
    responseEnvelope: envelope,
    runtimeError: null,
  };
}

export function failInventoryLoadAtRuntime<TEnvelope>(
  state: InventoryState<TEnvelope>,
  error: Failure,
): InventoryState<TEnvelope> {
  return {
    ...state,
    phase: "error",
    responseEnvelope: null,
    runtimeError: error,
  };
}

export function inventoryIsStale<TEnvelope>(state: InventoryState<TEnvelope>) {
  return Boolean(state.lastSuccessfulEnvelope)
    && (state.phase === "error" || state.phase === "unsupported");
}
