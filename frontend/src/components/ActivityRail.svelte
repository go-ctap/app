<script lang="ts">
  import { flip } from "svelte/animate";
  import { fade, fly, slide } from "svelte/transition";
  import {
    Activity,
    ChevronRight,
    Clock3,
    LockKeyhole,
    RefreshCw,
    Square,
    UnlockKeyhole,
  } from "@lucide/svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { api } from "../lib/api";
  import { closeSelectedSession, openSelectedSession, refreshDiscovery } from "../lib/controller";
  import {
    activeScreen,
    focusLogEntry,
    selectedDevice,
    selectedSelector,
    sessionStatus,
    statusBar,
    workbenchLog,
  } from "../lib/stores";
  import { labelDevice, operationStageLabel, sessionStateLabel } from "../lib/format";
  import StatusBadge from "./StatusBadge.svelte";

  type Props = {
    variant?: "rail" | "sheet";
    class?: string;
  };

  type ActivityAction = {
    id: string;
    label: string;
    variant: "default" | "outline" | "destructive";
    icon?: "details" | "cancel";
    run: () => void | Promise<void>;
  };

  let { variant = "rail", class: className = "" }: Props = $props();
  let sheetOpen = $state(false);

  let operation = $derived($statusBar.activeOperation);
  let event = $derived(operation?.event);
  let outcome = $derived($statusBar.lastOutcome);
  let recentLogs = $derived($workbenchLog.slice(0, 7));
  let selectedLabel = $derived($selectedDevice ? labelDevice($selectedDevice) : "");
  let canOpenSession = $derived(Boolean($selectedSelector) && ["closed", "stale", "error"].includes($sessionStatus.state || ""));
  let canCloseSession = $derived($sessionStatus.state === "ready");
  let needsRefreshRecovery = $derived($sessionStatus.state === "stale" || $sessionStatus.state === "error" || outcome?.title === "Discovery issue");
  let detailLogEntryId = $derived(operation?.logEntryId || outcome?.logEntryId);
  let activityView = $derived({
    running: Boolean(operation),
    title: operation ? event?.message || operationStageLabel(event?.stage) || "Operation running" : outcome?.title || "Workbench ready",
    message: operation ? progressLabel(event) : outcome?.message || selectedLabel || "Select an authenticator to begin.",
  });
  let operationProgress = $derived.by(() => {
    const completed = operation?.event?.completed;
    const total = operation?.event?.total;
    if (typeof completed !== "number" || typeof total !== "number" || total <= 0) return null;
    return { completed, total };
  });
  let hasProgress = $derived(Boolean(operationProgress));
  let activityActions = $derived.by((): ActivityAction[] => {
    const actions: ActivityAction[] = [];

    if (detailLogEntryId) {
      actions.push({
        id: `details:${detailLogEntryId}`,
        label: "View details",
        variant: "outline",
        icon: "details",
        run: () => viewDetails(detailLogEntryId),
      });
    }

    if (operation?.operationId) {
      actions.push({
        id: `cancel:${operation.operationId}`,
        label: "Cancel",
        variant: "destructive",
        icon: "cancel",
        run: cancel,
      });
      return actions;
    }

    if (outcome?.retry) {
      actions.push({
        id: `retry:${outcome.logEntryId || outcome.title || "latest"}`,
        label: "Retry",
        variant: "outline",
        run: outcome.retry,
      });
    }

    for (const action of $statusBar.actions) {
      actions.push({
        id: `status:${action.id}`,
        label: action.label,
        variant: actionVariant(action.tone),
        run: () => runAction(action),
      });
    }

    if (canOpenSession) {
      actions.push({
        id: "open-session",
        label: "Open session",
        variant: "outline",
        run: openSession,
      });
    }

    if (needsRefreshRecovery) {
      actions.push({
        id: "refresh-devices",
        label: "Refresh devices",
        variant: "outline",
        run: refreshDiscovery,
      });
    }

    return actions;
  });

  function progressLabel(value: any) {
    if (!value) return "";
    if (value.completed !== undefined && value.total !== undefined) {
      return `${value.completed} / ${value.total}`;
    }
    if (!value.stage) return "";
    return operationStageLabel(value.stage);
  }

  function formatTime(value: string | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function logToneVariant(tone: string) {
    if (tone === "error") return "destructive";
    if (tone === "success") return "default";
    return "secondary";
  }

  function actionVariant(tone: string | undefined): ActivityAction["variant"] {
    if (tone === "danger") return "destructive";
    if (tone === "default") return "default";
    return "outline";
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
    sheetOpen = false;
  }

  function openLogs() {
    if (recentLogs[0]?.id) {
      focusLogEntry(recentLogs[0].id);
    } else {
      activeScreen.set("logs");
    }
    sheetOpen = false;
  }

  async function openSession() {
    await openSelectedSession($selectedSelector);
  }
</script>

{#snippet railContent()}
  <Card.Root size="sm">
    <Card.Header>
      <Card.Title class="text-sm">Session</Card.Title>
      <Card.Description>{selectedLabel || "No authenticator selected"}</Card.Description>
    </Card.Header>
    <Card.Content class="grid gap-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-muted-foreground">State</span>
        <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
      </div>

      <Separator />

      <dl class="grid gap-2 text-sm">
        <div class="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt class="text-muted-foreground">Transport</dt>
          <dd class="m-0 truncate">{$selectedDevice?.transport || "unknown"}</dd>
        </div>
        <div class="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt class="text-muted-foreground">Selector</dt>
          <dd class="m-0 min-w-0 break-words font-mono text-xs">{$selectedSelector || "not selected"}</dd>
        </div>
        {#if $sessionStatus.openedAt}
          <div class="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <dt class="text-muted-foreground">Opened</dt>
            <dd class="m-0 truncate">{formatTime($sessionStatus.openedAt)}</dd>
          </div>
        {/if}
        {#if $sessionStatus.updatedAt}
          <div class="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <dt class="text-muted-foreground">Updated</dt>
            <dd class="m-0 truncate">{formatTime($sessionStatus.updatedAt)}</dd>
          </div>
        {/if}
      </dl>

      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" type="button" onclick={refreshDiscovery}>
          <RefreshCw />
          Refresh
        </Button>
        {#if canCloseSession}
          <Button variant="outline" size="sm" type="button" onclick={closeSelectedSession}>
            <LockKeyhole />
            Close
          </Button>
        {:else if canOpenSession}
          <Button variant="outline" size="sm" type="button" onclick={openSession}>
            <UnlockKeyhole />
            Open
          </Button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root size="sm">
    <Card.Header>
      <Card.Title class="text-sm">Current activity</Card.Title>
      <Card.Description>Operation and recovery state</Card.Description>
    </Card.Header>
    <Card.Content class="grid gap-2">
      <Item.Root size="sm" variant={activityView.running ? "muted" : "outline"}>
        <Item.Media>
          <div class="flex size-9 items-center justify-center rounded-md border bg-background transition-colors duration-150">
            {#if activityView.running}
              <Clock3 class="size-4 animate-pulse text-muted-foreground" />
            {:else}
              <Activity class="size-4 text-muted-foreground" />
            {/if}
          </div>
        </Item.Media>
        <Item.Content>
          <Item.Title>{activityView.title}</Item.Title>
          <Item.Description>{activityView.message || " "}</Item.Description>
        </Item.Content>
      </Item.Root>

      {#if hasProgress}
        <div class="overflow-hidden py-1" transition:slide={{ duration: 160, axis: "y" }}>
          <div in:fade={{ duration: 120 }} out:fade={{ duration: 90 }}>
            <Progress value={operationProgress.completed} max={operationProgress.total} />
          </div>
        </div>
      {/if}

      <Item.Actions>
        {#each activityActions as action (action.id)}
          <Button variant={action.variant} size="sm" type="button" onclick={action.run}>
            {#if action.icon === "cancel"}
              <Square />
            {/if}
            <span>{action.label}</span>
            {#if action.icon === "details"}
              <ChevronRight />
            {/if}
          </Button>
        {/each}
      </Item.Actions>
    </Card.Content>
  </Card.Root>

  <Card.Root size="sm">
    <Card.Header>
      <Card.Title class="text-sm">Recent events</Card.Title>
      <Card.Description>Latest app activity</Card.Description>
      <Card.Action>
        <Button variant="ghost" size="sm" type="button" onclick={openLogs}>View all</Button>
      </Card.Action>
    </Card.Header>
    <Card.Content>
      {#if recentLogs.length}
        <Item.Group>
          {#each recentLogs as entry, index (entry.id)}
            <div animate:flip={{ duration: 160 }} in:fly={{ y: -4, duration: 140 }}>
              <Item.Root size="sm">
                {#snippet child({ props })}
                  <button
                    {...props}
                    type="button"
                    class={[props.class, "cursor-pointer text-left"].filter(Boolean).join(" ")}
                    onclick={() => viewDetails(entry.id)}
                  >
                    <Item.Media>
                      <Badge variant={logToneVariant(entry.tone)} class="size-2 rounded-full p-0" title={entry.tone}></Badge>
                    </Item.Media>
                    <Item.Content class="min-w-0 gap-0.5">
                      <Item.Title class="truncate text-xs">{entry.title}</Item.Title>
                      <Item.Description class="truncate">{entry.message || entry.source}</Item.Description>
                    </Item.Content>
                    <Item.Actions>
                      <time class="text-xs text-muted-foreground" datetime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                    </Item.Actions>
                  </button>
                {/snippet}
              </Item.Root>
              {#if index !== recentLogs.length - 1}
                <Item.Separator />
              {/if}
            </div>
          {/each}
        </Item.Group>
      {:else}
        <p class="m-0 text-sm text-muted-foreground" in:fade={{ duration: 120 }} out:fade={{ duration: 90 }}>No events yet.</p>
      {/if}
    </Card.Content>
  </Card.Root>
{/snippet}

{#if variant === "sheet"}
  <Sheet.Root bind:open={sheetOpen}>
    <Sheet.Trigger class={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Open activity panel" title="Activity">
      <Activity class="size-4" />
    </Sheet.Trigger>
    <Sheet.Content side="right" class="w-[min(28rem,calc(100vw-1rem))] p-0 sm:max-w-md">
      <Sheet.Header class="border-b">
        <Sheet.Title>Activity</Sheet.Title>
        <Sheet.Description>Session state, operation progress, and recent events.</Sheet.Description>
      </Sheet.Header>
      <ScrollArea class="min-h-0 flex-1">
        <div class="grid gap-4 p-4">
          {@render railContent()}
        </div>
      </ScrollArea>
    </Sheet.Content>
  </Sheet.Root>
{:else}
  <aside class={`hidden xl:block ${className}`} aria-label="Session and activity summary">
    <div class="sticky top-[4.5rem] grid gap-4">
      {@render railContent()}
    </div>
  </aside>
{/if}
