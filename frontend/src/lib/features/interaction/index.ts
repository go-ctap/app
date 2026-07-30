import { readonly } from "svelte/store";

import * as state from "$lib/features/interaction/state.js";

export const pendingInteraction = readonly(state.pendingInteraction);

export {
  answerPendingInteraction,
  handleInteractionRequested,
} from "$lib/interaction-controller.js";
