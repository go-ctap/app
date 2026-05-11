import App from "./App.svelte";
// @ts-ignore
import "./app.css";
import { Events, System } from "@wailsio/runtime";
import { mount } from "svelte";
import { initLocale } from "$lib/i18n";

async function syncTheme() {
  try {
    document.documentElement.classList.toggle("dark", await System.IsDarkMode());
  } catch {
    document.documentElement.classList.remove("dark");
  }
}

void syncTheme();
initLocale();
Events.On(Events.Types.Common.ThemeChanged, () => {
  void syncTheme();
});

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
