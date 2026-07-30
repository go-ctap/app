export type RetainedInventoryPhase =
  "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";

export type RetainedInventoryState<TReport> = {
  phase: RetainedInventoryPhase;
  report: TReport | null;
  lastSuccessfulAt: string | null;
};

export function emptyRetainedInventoryState<TReport>(): RetainedInventoryState<TReport> {
  return {
    phase: "idle",
    report: null,
    lastSuccessfulAt: null,
  };
}

export function retainedInventoryIsStale<TReport>(state: RetainedInventoryState<TReport>) {
  return state.report !== null && (state.phase === "error" || state.phase === "unsupported");
}

export function beginRetainedInventoryLoad<TReport>(
  state: RetainedInventoryState<TReport>,
): RetainedInventoryState<TReport> {
  return {
    ...state,
    phase: state.report === null ? "loading" : "refreshing",
  };
}

export function completeRetainedInventoryLoad<TReport>(
  report: TReport,
  completedAt: string,
): RetainedInventoryState<TReport> {
  return {
    phase: "ready",
    report,
    lastSuccessfulAt: completedAt,
  };
}

export function failRetainedInventoryLoad<TReport>(
  state: RetainedInventoryState<TReport>,
  unsupported = false,
): RetainedInventoryState<TReport> {
  return {
    ...state,
    phase: unsupported ? "unsupported" : "error",
  };
}
