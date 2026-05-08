<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { api } from "../lib/api";
  import { operationStatus } from "../lib/stores";

  let event = $derived($operationStatus?.event);
  let label = $derived(event?.message || event?.stage || "Ready");

  async function cancel() {
    if ($operationStatus?.operationId) {
      await api.cancelOperation($operationStatus.operationId);
    }
  }
</script>

{#if $operationStatus?.operationId}
  <div class="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
    <div>
      <strong>{label}</strong>
      {#if event?.completed !== undefined && event?.total !== undefined}
        <span class="ml-2 text-sm text-muted-foreground">{event.completed} / {event.total}</span>
      {/if}
    </div>
    <Button variant="destructive" type="button" onclick={cancel}>Cancel</Button>
  </div>
{/if}
