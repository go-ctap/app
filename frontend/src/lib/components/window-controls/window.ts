import { Window as WailsWindow } from "@wailsio/runtime";

export function minimizeWindow() {
  return WailsWindow.Minimise();
}

export function toggleMaximizeWindow() {
  return WailsWindow.ToggleMaximise();
}

export function closeWindow() {
  return WailsWindow.Close();
}

export function isWindowMaximized() {
  return WailsWindow.IsMaximised();
}
