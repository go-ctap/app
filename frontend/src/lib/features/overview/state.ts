import { writable } from "svelte/store";

import type { LookupResult } from "../../../../bindings/github.com/go-ctap/mds/model";
import type { BioSensorEnvelope } from "../../../../bindings/telesma/service";

import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import { idleLoadState, type LoadState } from "$lib/load-state";
export { errorLoadState, idleLoadState, loadingLoadState, readyLoadState, type LoadState } from "$lib/load-state";

export const overviewBioSensor = writable<LoadState<BioSensorEnvelope>>(idleLoadState());
export const overviewMDS = writable<LoadState<LookupResult | null>>(idleLoadState());

export function resetOverviewStateForTest() {
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
}

deviceFeatureLifecycles.register("overview", {
  resetForAuthenticatorChange: resetOverviewStateForTest,
  resetForTest: resetOverviewStateForTest,
});
