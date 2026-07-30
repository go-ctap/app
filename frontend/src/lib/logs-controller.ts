import { api } from "$lib/api.js";
import { logController } from "$lib/features/logs/state.svelte.js";

export async function syncLogJournal(): Promise<void> {
  try {
    logController.applyBatch(await api.readLogs({ after: logController.cursor }));
  } catch {
    // runtimeCall records bridge failures in the local journal.
  }
}

export async function clearLogJournal(): Promise<boolean> {
  try {
    const cursor = await api.clearLogs();

    logController.clear(cursor.sequence);
    await syncLogJournal();

    return true;
  } catch {
    return false;
  }
}
