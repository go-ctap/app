import { readonly } from "svelte/store";

import * as state from "$lib/features/workbench/state.js";

export const activeScreen = readonly(state.activeScreen);

export const statusBar = readonly(state.statusBar);

export type {
  ActiveOperation,
  ActiveScreen,
  StatusBarOutcome,
  StatusBarState,
} from "$lib/features/workbench/state.js";

export { bootstrap, navigateToScreen, selectToken } from "$lib/workbench-controller.js";
