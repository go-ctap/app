import { derived, writable } from "svelte/store";
import type { LookupResult } from "../../../../bindings/github.com/go-ctap/kit/model/mds";
import type { RuntimeErrorEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";
import type { OperationEnvelope } from "../../api";

export type LoadStateName = "idle" | "loading" | "ready" | "error" | "stale";

export type LoadState<T> = {
  state: LoadStateName;
  data: T | null;
  error: RuntimeErrorEnvelope | null;
};

export type MDSLookupViewState = {
  result?: LookupResult | null;
  error?: RuntimeErrorEnvelope | null;
};

export const idleLoadState = <T>(): LoadState<T> => ({ state: "idle", data: null, error: null });
export const loadingLoadState = <T>(data: T | null = null): LoadState<T> => ({ state: "loading", data, error: null });
export const readyLoadState = <T>(data: T): LoadState<T> => ({ state: "ready", data, error: null });
export const errorLoadState = <T>(error: RuntimeErrorEnvelope, data: T | null = null): LoadState<T> => ({ state: "error", data, error });

export const overviewInspection = writable<LoadState<OperationEnvelope>>(idleLoadState());
export const overviewBioSensor = writable<LoadState<OperationEnvelope>>(idleLoadState());
export const overviewMDS = writable<LoadState<LookupResult | null>>(idleLoadState());

export const overviewEnvelope = derived(overviewInspection, ($state) => $state.data);
export const overviewBioSensorEnvelope = derived(overviewBioSensor, ($state) => $state.data);
export const overviewMDSLookup = derived(overviewMDS, ($state): MDSLookupViewState | null => {
  if ($state.state === "idle") return null;
  if ($state.error) return { error: $state.error };
  return { result: $state.data };
});
export const overviewLoading = derived(overviewInspection, ($state) => $state.state === "loading");
export const overviewMDSLoading = derived(overviewMDS, ($state) => $state.state === "loading");

export function resetOverviewStateForTest() {
  overviewInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
}
