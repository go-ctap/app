import { readonly } from "svelte/store";

import * as state from "./state.js";

export const activeScreen = readonly(state.activeScreen);
export const statusBar = readonly(state.statusBar);

export type {
  ActiveOperation,
  ActiveScreen,
  StatusBarOutcome,
  StatusBarState,
} from "./state.js";

export {
  bootstrap,
  navigateToScreen,
  selectToken,
} from "../../workbench-controller.js";
