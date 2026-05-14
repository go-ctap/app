import { System, Window } from "@wailsio/runtime";

export type WindowControlsPlatform = "windows" | "macos" | "gnome";
export type WindowControlsHideMethod = "display" | "visibility";

export interface WindowControlsOptions {
  platform?: WindowControlsPlatform | "system";
  hide?: boolean;
  hideMethod?: WindowControlsHideMethod;
  justify?: boolean;
  class?: string;
}

export function resolveWindowControlsPlatform(platform: WindowControlsOptions["platform"] = "system"): WindowControlsPlatform {
  if (platform && platform !== "system") return platform;
  if (System.IsMac()) return "macos";
  if (System.IsLinux()) return "gnome";
  return "windows";
}

export function startWindowDrag() {
  System.invoke("wails:drag");
}

export async function minimiseWindow() {
  await Window.Minimise();
}

export async function toggleMaximiseWindow() {
  await Window.ToggleMaximise();
}

export async function closeWindow() {
  await Window.Close();
}

export async function toggleFullscreenWindow() {
  await Window.ToggleFullscreen();
}

export async function isWindowMaximised() {
  return Window.IsMaximised();
}
