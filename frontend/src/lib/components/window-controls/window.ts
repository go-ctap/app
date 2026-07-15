import { Window as WailsWindow } from "@wailsio/runtime";

import { runtimeCall } from "$lib/features/logs/state.svelte.js";

export function minimizeWindow() {
  return runtimeCall("wails.window.minimize", () => WailsWindow.Minimise());
}

export function toggleMaximizeWindow() {
  return runtimeCall("wails.window.toggleMaximize", () => WailsWindow.ToggleMaximise());
}

export function closeWindow() {
  return runtimeCall("wails.window.close", () => WailsWindow.Close());
}

export function isWindowMaximized() {
  return runtimeCall("wails.window.isMaximized", () => WailsWindow.IsMaximised());
}
