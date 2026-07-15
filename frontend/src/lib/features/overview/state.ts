import { writable } from "svelte/store";

import type { LookupResult } from "../../../../bindings/github.com/go-ctap/kit/model/mds";
import type { BioSensorEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

import { idleLoadState, type LoadState } from "$lib/load-state";
export { errorLoadState, idleLoadState, loadingLoadState, readyLoadState, type LoadState } from "$lib/load-state";

export const overviewBioSensor = writable<LoadState<BioSensorEnvelope>>(idleLoadState());
export const overviewMDS = writable<LoadState<LookupResult | null>>(idleLoadState());

export function resetOverviewStateForTest() {
  overviewBioSensor.set(idleLoadState());
  overviewMDS.set(idleLoadState());
}
