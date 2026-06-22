import { writable } from "svelte/store";
import type { InteractionPrompt } from "../../../../bindings/github.com/go-ctap/kit/service";

export const pendingInteraction = writable<InteractionPrompt | null>(null);

export function resetInteractionStateForTest() {
  pendingInteraction.set(null);
}
