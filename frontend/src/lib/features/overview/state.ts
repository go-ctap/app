import { derived, writable } from "svelte/store";

import type { LookupResult } from "../../../../bindings/github.com/go-ctap/kit/model/mds";

import type { OperationEnvelope } from "$lib/api";
import { idleLoadState, type LoadState } from "$lib/load-state";
export { errorLoadState, idleLoadState, loadingLoadState, readyLoadState, type LoadState } from "$lib/load-state";

export const overviewInspection = writable<LoadState<OperationEnvelope>>(idleLoadState());
export const overviewBioSensor = writable<LoadState<OperationEnvelope>>(idleLoadState());
export const overviewMDS = writable<LoadState<LookupResult | null>>(idleLoadState());

export const overviewEnvelope = derived(overviewInspection, ($state) => $state.data);
export const overviewBioSensorEnvelope = derived(overviewBioSensor, ($state) => $state.data);
export const overviewLoading = derived(overviewInspection, ($state) => $state.state === "loading");
export const overviewMDSLoading = derived(overviewMDS, ($state) => $state.state === "loading");

export function resetOverviewStateForTest() {
  overviewInspection.set(idleLoadState());
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
}
