import { writable } from "svelte/store";

import type { InteractionPrompt } from "../../../../bindings/fidobench/service";

export const pendingInteraction = writable<InteractionPrompt | null>(null);

export function resetInteractionStateForTest() {
  pendingInteraction.set(null);
}
