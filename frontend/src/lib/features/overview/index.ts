import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "$lib/authenticator-controller.js";
import {
  loadOverview as loadOverviewOperation,
  loadOverviewMDS,
} from "$lib/overview-controller.js";
import * as authenticator from "$lib/features/authenticator/state.js";
import * as state from "$lib/features/overview/state.js";

export const authenticatorInspection = readonly(authenticator.authenticatorInspection);

export const overviewBioSensor = readonly(state.overviewBioSensor);

export const overviewMDS = readonly(state.overviewMDS);

export async function reloadOverview(): Promise<void> {
  if (!(await ensureActiveSelectionReady())) return;

  await loadOverviewOperation();
}

export { loadOverviewMDS, loadOverviewOperation as loadOverview };
