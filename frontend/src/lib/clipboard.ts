import { Clipboard } from "@wailsio/runtime";
import { toast } from "svelte-sonner";

import { m } from "../paraglide/messages.js";

export async function copyToClipboard(value: string, successMessage: string) {
  try {
    await Clipboard.SetText(value);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error(m.copy_failed());
    return false;
  }
}
