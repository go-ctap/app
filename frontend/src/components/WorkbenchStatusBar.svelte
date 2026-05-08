<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { api } from "../lib/api";
  import { lockSelectedSession, openSelectedSession, refreshDiscovery } from "../lib/controller";
  import { focusLogEntry, selectedDevice, selectedSelector, sessionStatus, statusBar } from "../lib/stores";
  import { labelDevice, operationStageLabel, sessionStateLabel } from "../lib/format";
  import StatusBadge from "./StatusBadge.svelte";

  let operation = $derived($statusBar.activeOperation);
  let event = $derived(operation?.event);
  let outcome = $derived($statusBar.lastOutcome);
  let hasContext = $derived(Boolean($selectedSelector || operation || outcome || $sessionStatus.state !== "idle"));
  let title = $derived(event?.message || operationStageLabel(event?.stage) || outcome?.title || "Workbench ready");
  let message = $derived(operation
    ? progressLabel(event)
    : outcome?.message || ($selectedDevice ? labelDevice($selectedDevice) : "Select a token to begin."));
  let detailLogEntryId = $derived(operation?.logEntryId || outcome?.logEntryId);
  let needsRefreshRecovery = $derived($sessionStatus.state === "stale" || $sessionStatus.state === "error" || outcome?.title === "Discovery issue");
  let canOpenSession = $derived(Boolean($selectedSelector) && ["closed", "stale", "error"].includes($sessionStatus.state || ""));
  let canLockSession = $derived($sessionStatus.state === "ready");

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
  <section
    class={`fixed right-4 bottom-3 left-4 z-30 grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur max-sm:right-2 max-sm:left-2 max-sm:grid-cols-1 ${operation ? "border-warning bg-warning/90 text-warning-foreground" : ""} ${outcome?.tone === "error" || $sessionStatus.state === "error" || $sessionStatus.state === "stale" ? "border-destructive/30 bg-destructive/10 text-destructive" : ""}`}
    aria-live="polite"
  >
    <div class="flex min-w-0 items-center gap-3">
      <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
      <div class="grid min-w-0 gap-0.5">
        <strong class="truncate">{title}</strong>
        {#if message}
          <span class="truncate text-sm text-muted-foreground max-sm:whitespace-normal">{message}</span>
        {/if}
        {#if operation?.event?.completed !== undefined && operation?.event?.total}
          <Progress value={operation.event.completed} max={operation.event.total} />
        {/if}
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 max-sm:justify-start">
      {#if operation}
        {#if detailLogEntryId}
          <Button variant="outline" size="sm" type="button" onclick={() => viewDetails(detailLogEntryId)}>View details</Button>
        {/if}
        {#if operation.operationId}
          <Button variant="destructive" size="sm" type="button" onclick={cancel}>Cancel</Button>
        {/if}
      {:else}
        {#if detailLogEntryId}
          <Button variant="outline" size="sm" type="button" onclick={() => viewDetails(detailLogEntryId)}>View details</Button>
        {/if}
        {#if outcome?.retry}
          <Button variant="outline" size="sm" type="button" onclick={outcome.retry}>Retry</Button>
        {/if}
        {#each $statusBar.actions as action (action.id)}
          <Button variant={action.tone === "danger" ? "destructive" : action.tone === "default" ? "default" : "outline"} size="sm" type="button" onclick={() => runAction(action)}>{action.label}</Button>
        {/each}
        {#if canOpenSession}
          <Button variant="outline" size="sm" type="button" onclick={() => openSelectedSession($selectedSelector)}>Open session</Button>
        {/if}
        {#if needsRefreshRecovery}
          <Button variant="outline" size="sm" type="button" onclick={refreshDiscovery}>Refresh devices</Button>
        {/if}
        {#if canLockSession}
          <Button variant="outline" size="sm" type="button" onclick={lockSelectedSession}>Lock session</Button>
        {/if}
      {/if}
    </div>
  </section>
{/if}
