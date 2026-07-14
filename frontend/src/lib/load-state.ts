import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

export type LoadStateName = "idle" | "loading" | "ready" | "error";

export type LoadState<T> = {
  state: LoadStateName;
  data: T | null;
  error: Failure | null;
};

export const idleLoadState = <T>(): LoadState<T> => ({ state: "idle", data: null, error: null });
export const loadingLoadState = <T>(data: T | null = null): LoadState<T> => ({ state: "loading", data, error: null });
export const readyLoadState = <T>(data: T): LoadState<T> => ({ state: "ready", data, error: null });
export const errorLoadState = <T>(error: Failure, data: T | null = null): LoadState<T> => ({ state: "error", data, error });
