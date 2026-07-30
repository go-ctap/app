import "./app.css";

import { Events, System } from "@wailsio/runtime";
import { mount } from "svelte";

import { initializeApplicationConfig } from "$lib/i18n";

import App from "./App.svelte";

async function syncTheme() {
  try {
    const dark = await System.IsDarkMode();

    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {
    // Keep the current theme until the Wails runtime is available again.
  }
}

const refreshTheme = () => void syncTheme();

refreshTheme();
Events.On(Events.Types.Common.ThemeChanged, refreshTheme);
window.addEventListener("focus", refreshTheme);
await initializeApplicationConfig();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
