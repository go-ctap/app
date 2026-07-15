import { Browser } from "@wailsio/runtime";
import { toast } from "svelte-sonner";

import { m } from "../paraglide/messages.js";
import { recordRuntimeFailure } from "./features/logs/state.svelte.js";

export async function openExternalLink(event: MouseEvent, url: string) {
  event.preventDefault();

  try {
    await Browser.OpenURL(url);
    return true;
  } catch (error) {
    recordRuntimeFailure("wails.browser.openURL", error);
    toast.error(m.open_link_failed());
    return false;
  }
}
