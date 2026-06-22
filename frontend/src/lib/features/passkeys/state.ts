import { derived, writable } from "svelte/store";

import type { CredentialsEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

import { idleLoadState, type LoadState } from "$lib/load-state";

export const passkeysInventory = writable<LoadState<CredentialsEnvelope>>(idleLoadState());

export const passkeysEnvelope = derived(passkeysInventory, ($state) => $state.data);
export const passkeysLoading = derived(passkeysInventory, ($state) => $state.state === "loading");

export function resetPasskeysStateForTest() {
  passkeysInventory.set(idleLoadState());
}
