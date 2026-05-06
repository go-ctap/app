import { derived, get, writable } from "svelte/store";
import type { Discovery } from "./api";

export const devices = writable<any[]>([]);
export const selectedSelector = writable("");
export const selectedDevice = writable<any | null>(null);
export const activeScreen = writable("overview");
export const operationStatus = writable<any | null>(null);
export const pendingInteraction = writable<any | null>(null);
export const appError = writable<string | null>(null);
export const toasts = writable<string[]>([]);

export const hasSelection = derived(selectedSelector, ($selectedSelector) => $selectedSelector.trim().length > 0);

export function applyDiscovery(response: Discovery) {
  devices.set(response.devices || []);
  selectedSelector.set(response.selectedSelector || "");
  selectedDevice.set(response.selectedDevice || null);
  if (response.error) {
    appError.set(response.error.hint ? `${response.error.message} ${response.error.hint}` : response.error.message);
  } else {
    appError.set(null);
  }
}

export function pushToast(message: string) {
  toasts.update((items) => [message, ...items].slice(0, 3));
  setTimeout(() => {
    toasts.update((items) => items.filter((item) => item !== message));
  }, 4200);
}

export function currentSelector() {
  return get(selectedSelector);
}
