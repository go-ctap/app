import { readonly, writable } from "svelte/store";

const ADVANCED_MODE_STORAGE_KEY = "fidoapp.advancedMode";

const advancedModeState = writable(initialAdvancedMode());

export const advancedMode = readonly(advancedModeState);

export function setAdvancedMode(enabled: boolean) {
  try {
    localStorage.setItem(ADVANCED_MODE_STORAGE_KEY, String(enabled));
  } catch {
    // Persisting UI preferences is best-effort in embedded webviews.
  }
  advancedModeState.set(enabled);
}

function initialAdvancedMode() {
  try {
    return localStorage.getItem(ADVANCED_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
