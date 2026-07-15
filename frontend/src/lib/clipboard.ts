import { Clipboard } from "@wailsio/runtime";
import { toast } from "svelte-sonner";

import { m } from "../paraglide/messages.js";
import { recordRuntimeFailure } from "./features/logs/state.svelte.js";

export async function copyToClipboard(value: string, successMessage: string) {
  try {
    await Clipboard.SetText(value);
    toast.success(successMessage);
    return true;
  } catch (error) {
    recordRuntimeFailure("wails.clipboard.setText", error);
    toast.error(m.copy_failed());
    return false;
  }
}
