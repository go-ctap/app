import { System } from "@wailsio/runtime";

import { runtimeCall } from "./features/logs/state.svelte.js";

export type WindowPlatform = "linux" | "macos" | "windows";

export function windowPlatformFromOS(os: string): WindowPlatform | null {
  switch (os) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    case "windows":
      return "windows";
    default:
      return null;
  }
}

export function detectWindowPlatform(): WindowPlatform | null {
  if (System.IsMac()) return "macos";
  if (System.IsWindows()) return "windows";
  if (System.IsLinux()) return "linux";
  return null;
}

export async function resolveWindowPlatform(): Promise<WindowPlatform | null> {
  const detected = detectWindowPlatform();
  if (detected) return detected;
  return runtimeCall("wails.system.environment", async () => windowPlatformFromOS((await System.Environment()).OS));
}
