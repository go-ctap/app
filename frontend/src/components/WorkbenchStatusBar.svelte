<script lang="ts">
  import { api } from "../lib/api";
  import { lockSelectedSession, openSelectedSession, refreshDiscovery } from "../lib/controller";
  import { focusLogEntry, selectedDevice, selectedSelector, sessionStatus, statusBar } from "../lib/stores";
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
  $: detailLogEntryId = operation?.logEntryId || outcome?.logEntryId;
  $: needsRefreshRecovery = $sessionStatus.state === "stale" || $sessionStatus.state === "error" || outcome?.title === "Discovery issue";
  $: canOpenSession = Boolean($selectedSelector) && ["closed", "stale", "error"].includes($sessionStatus.state || "");
  $: canLockSession = $sessionStatus.state === "ready";

  function progressLabel(value: any) {
    if (!value) return "";
    if (value.completed !== undefined && value.total !== undefined) {
      return `${value.completed} / ${value.total}`;
    }
    if (!value.stage) return "";
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
    focusLogEntry(id);
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
      {#if operation}
        {#if detailLogEntryId}
          <button class="quiet" type="button" on:click={() => viewDetails(detailLogEntryId)}>View details</button>
        {/if}
        {#if operation.operationId}
          <button class="quiet danger" type="button" on:click={cancel}>Cancel</button>
        {/if}
      {:else}
        {#if detailLogEntryId}
          <button class="quiet" type="button" on:click={() => viewDetails(detailLogEntryId)}>View details</button>
        {/if}
        {#if outcome?.retry}
          <button class="quiet" type="button" on:click={outcome.retry}>Retry</button>
        {/if}
        {#each $statusBar.actions as action}
          <button class:danger={action.tone === "danger"} class:quiet={action.tone !== "default"} type="button" on:click={() => runAction(action)}>{action.label}</button>
        {/each}
        {#if canOpenSession}
          <button class="quiet" type="button" on:click={() => openSelectedSession($selectedSelector)}>Open session</button>
        {/if}
        {#if needsRefreshRecovery}
          <button class="quiet" type="button" on:click={refreshDiscovery}>Refresh devices</button>
        {/if}
        {#if canLockSession}
          <button class="quiet" type="button" on:click={lockSelectedSession}>Lock session</button>
        {/if}
      {/if}
    </div>
  </section>
{/if}
