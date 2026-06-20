import { System, Window } from "@wailsio/runtime";

export type WindowControlsHideMethod = "display" | "visibility";

export interface WindowControlsOptions {
  hide?: boolean;
  hideMethod?: WindowControlsHideMethod;
  justify?: boolean;
  class?: string;
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

export async function isWindowMaximised() {
  return Window.IsMaximised();
}
