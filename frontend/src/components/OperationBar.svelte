<script lang="ts">
  import { api } from "../lib/api";
  import { operationStatus } from "../lib/stores";

  $: event = $operationStatus?.event;
  $: label = event?.message || event?.stage || "Ready";

  async function cancel() {
    if ($operationStatus?.operationId) {
      await api.cancelOperation($operationStatus.operationId);
    }
  }
</script>

{#if $operationStatus}
  <div class="operation-bar">
    <div>
      <strong>{label}</strong>
      {#if event?.completed !== undefined && event?.total !== undefined}
        <span>{event.completed} / {event.total}</span>
      {/if}
    </div>
    <button class="quiet danger" type="button" on:click={cancel}>Cancel</button>
  </div>
{/if}
