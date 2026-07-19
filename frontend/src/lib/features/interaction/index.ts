import { readonly } from "svelte/store";

import * as state from "./state.js";

export const pendingInteraction = readonly(state.pendingInteraction);

export {
  answerPendingInteraction,
  handleInteractionRequested,
} from "../../interaction-controller.js";
