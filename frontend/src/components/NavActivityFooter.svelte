<script lang="ts">
  import { Activity, Clock3, RefreshCw, Square } from "@lucide/svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { api } from "$lib/api";
  import { openSelectedSession, refreshDiscovery } from "$lib/controller";
  import { selectedDevice, selectedSelector, sessionStatus, statusBar } from "$lib/stores";
  import { deviceName, operationStageLabel, sessionStateLabel } from "$lib/format";
  import { m } from "../paraglide/messages.js";

  type ActivityAction = {
    id: string;
    label: string;
    variant: "default" | "outline" | "destructive";
    icon?: "cancel" | "refresh";
    run: () => void | Promise<void>;
  };

  let operation = $derived($statusBar.activeOperation);
  let event = $derived(operation?.event);
  let outcome = $derived($statusBar.lastOutcome);
  let selectedName = $derived($selectedDevice ? deviceName($selectedDevice) : "");
  let canOpenSession = $derived(Boolean($selectedSelector) && ["idle", "closed", "stale", "error"].includes($sessionStatus.state || ""));
  let needsRefreshRecovery = $derived($sessionStatus.state === "stale" || $sessionStatus.state === "error" || outcome?.title === m.discovery_issue());
  let activityView = $derived({
    running: Boolean(operation),
    tone: outcome?.tone || "info",
    title: operation ? event?.message || operationStageLabel(event?.stage) || m.operation_running() : outcome?.title || m.workbench_ready(),
    message: operation ? progressLabel(event) : outcome?.message || selectedName || m.select_authenticator_to_begin(),
  });
  let operationProgress = $derived.by(() => {
    const completed = operation?.event?.completed;
    const total = operation?.event?.total;
    if (typeof completed !== "number" || typeof total !== "number" || total <= 0) return null;
    return { completed, total };
  });
  let activityActions = $derived.by((): ActivityAction[] => {
    const actions: ActivityAction[] = [];

    if (operation?.operationId) {
      actions.push({
        id: `cancel:${operation.operationId}`,
        label: m.cancel(),
        variant: "destructive",
        icon: "cancel",
        run: cancel,
      });
      return actions;
    }

    if (outcome?.retry) {
      actions.push({
        id: `retry:${outcome.logEntryId || outcome.title || "latest"}`,
        label: m.retry(),
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
        label: m.open_session(),
        variant: "outline",
        run: () => openSelectedSession($selectedSelector),
      });
    }

    if (needsRefreshRecovery) {
      actions.push({
        id: "refresh-devices",
        label: m.refresh_devices(),
        variant: "outline",
        icon: "refresh",
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

  function toneVariant(tone: string | undefined) {
    if (tone === "error") return "destructive";
    if (tone === "success") return "default";
    return "secondary";
  }
</script>

<section class="grid gap-2 px-2 py-2" aria-label={m.current_activity()}>
  <div class="flex min-w-0 items-start gap-2">
    <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
      {#if activityView.running}
        <Clock3 class="size-3.5 animate-pulse text-muted-foreground" />
      {:else}
        <Activity class="size-3.5 text-muted-foreground" />
      {/if}
    </div>
    <div class="grid min-w-0 flex-1 gap-0.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="truncate text-xs font-medium">{activityView.title}</span>
        {#if !activityView.running && outcome?.tone}
          <Badge variant={toneVariant(outcome.tone)} class="h-4 rounded px-1 text-[0.625rem] leading-none">{outcome.tone}</Badge>
        {/if}
      </div>
      <p class="m-0 line-clamp-2 text-xs leading-snug text-muted-foreground">
        {activityView.message || sessionStateLabel($sessionStatus.state)}
      </p>
    </div>
  </div>

  {#if operationProgress}
    <Progress value={operationProgress.completed} max={operationProgress.total} class="h-1" />
  {/if}

  {#if activityActions.length}
    <div class="flex flex-wrap gap-1">
      {#each activityActions as action (action.id)}
        <Button variant={action.variant} size="xs" type="button" onclick={action.run} title={action.label}>
          {#if action.icon === "cancel"}
            <Square />
          {:else if action.icon === "refresh"}
            <RefreshCw />
          {/if}
          <span>{action.label}</span>
        </Button>
      {/each}
    </div>
  {/if}
</section>
