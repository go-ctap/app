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
  <div class="operation-bar">
    <div>
      <strong>{label}</strong>
      {#if event?.completed !== undefined && event?.total !== undefined}
        <span>{event.completed} / {event.total}</span>
      {/if}
    </div>
    <Button variant="destructive" type="button" onclick={cancel}>Cancel</Button>
  </div>
{/if}
