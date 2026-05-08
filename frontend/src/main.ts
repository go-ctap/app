import App from "./App.svelte";
import "./app.css";
import { Events, System } from "@wailsio/runtime";
import { mount } from "svelte";

async function syncTheme() {
  try {
    document.documentElement.classList.toggle("dark", await System.IsDarkMode());
  } catch {
    document.documentElement.classList.remove("dark");
  }
}

void syncTheme();
Events.On(Events.Types.Common.ThemeChanged, () => {
  void syncTheme();
});

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
