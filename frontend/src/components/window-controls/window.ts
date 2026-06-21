import { System } from "@wailsio/runtime";

export function startWindowDrag() {
  System.invoke("wails:drag");
}
