<script lang="ts">
  import { api } from "../lib/api";
  import { lockSelectedSession, refreshDiscovery } from "../lib/controller";
  import { selectedDevice, selectedSelector, sessionStatus, statusBar } from "../lib/stores";
  import { labelDevice, operationStageLabel, sessionStateLabel } from "../lib/format";
  import StatusBadge from "./StatusBadge.svelte";

  $: operation = $statusBar.activeOperation;
  $: event = operation?.event;
  $: outcome = $statusBar.lastOutcome;
  $: hasContext = Boolean($selectedSelector || operation || outcome || $sessionStatus.state !== "idle");
  $: title = event?.message || operationStageLabel(event?.stage) || outcome?.title || "Workbench ready";
  $: message = operation
    ? progressLabel(event)
    : outcome?.message || ($selectedDevice ? labelDevice($selectedDevice) : "Select a token to begin.");

  function progressLabel(value: any) {
    if (!value) return "";
    if (value.completed !== undefined && value.total !== undefined) {
      return `${value.completed} / ${value.total}`;
    }
    return operationStageLabel(value.stage);
  }

  async function cancel() {
    if (operation?.operationId) {
      await api.cancelOperation(operation.operationId);
    }
  }

  async function runAction(action: any) {
    await action.run?.();
  }

  function viewDetails(id: string | undefined) {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
</script>

{#if hasContext}
  <section class:running={Boolean(operation)} class:error={outcome?.tone === "error" || $sessionStatus.state === "error" || $sessionStatus.state === "stale"} class="workbench-status-bar" aria-live="polite">
    <div class="status-context">
      <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
      <div class="status-copy">
        <strong>{title}</strong>
        {#if message}
          <span>{message}</span>
        {/if}
      </div>
    </div>

    <div class="status-actions">
      {#if operation?.operationId}
        <button class="quiet danger" type="button" on:click={cancel}>Cancel</button>
      {:else}
        {#if outcome?.detailId}
          <button class="quiet" type="button" on:click={() => viewDetails(outcome?.detailId)}>View details</button>
        {/if}
        {#if outcome?.retry}
          <button class="quiet" type="button" on:click={outcome.retry}>Retry</button>
        {/if}
        {#each $statusBar.actions as action}
          <button class:danger={action.tone === "danger"} class:quiet={action.tone !== "default"} type="button" on:click={() => runAction(action)}>{action.label}</button>
        {/each}
        <button class="quiet" type="button" on:click={refreshDiscovery}>Refresh</button>
        <button class="quiet" type="button" on:click={lockSelectedSession} disabled={$sessionStatus.state === "idle" || $sessionStatus.state === "closed"}>Clear session</button>
      {/if}
    </div>
  </section>
{/if}
