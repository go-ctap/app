import { Browser } from "@wailsio/runtime";
import { toast } from "svelte-sonner";

import { m } from "../paraglide/messages.js";

export async function openExternalLink(event: MouseEvent, url: string) {
  event.preventDefault();

  try {
    await Browser.OpenURL(url);
    return true;
  } catch {
    toast.error(m.open_link_failed());
    return false;
  }
}
