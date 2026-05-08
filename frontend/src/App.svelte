<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import { Database, FlaskConical, KeyRound, LayoutDashboard, LockKeyhole, RefreshCw, ScrollText, Settings2, ShieldCheck, UnlockKeyhole } from "@lucide/svelte";
  import { bootstrap, handleInteractionRequested, handleOperationProgress, handleSessionChanged, loadOverview, lockSelectedSession, openSelectedSession, refreshDiscovery, selectToken } from "./lib/controller";
  import { activeScreen, appError, devices, focusLogEntry, selectedDevice, selectedSelector, sessionBusy, sessionStatus, toasts, workbenchLog } from "./lib/stores";
  import { labelDevice, sessionStateLabel } from "./lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { NativeSelect } from "$lib/components/ui/native-select/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import StatusBadge from "./components/StatusBadge.svelte";
  import WorkbenchStatusBar from "./components/WorkbenchStatusBar.svelte";
  import InteractionModal from "./components/InteractionModal.svelte";
  import Overview from "./screens/Overview.svelte";
  import Credentials from "./screens/Credentials.svelte";
  import LargeBlobs from "./screens/LargeBlobs.svelte";
  import Config from "./screens/Config.svelte";
  import Lab from "./screens/Lab.svelte";
  import Logs from "./screens/Logs.svelte";

  const screens = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "credentials", label: "Credentials", icon: KeyRound },
    { id: "largeBlobs", label: "Large blobs", icon: Database },
    { id: "config", label: "Config", icon: Settings2 },
    { id: "lab", label: "Lab", icon: FlaskConical },
    { id: "logs", label: "Logs", icon: ScrollText },
  ];

  let refreshing = $state(false);
  let recentLogs = $derived($workbenchLog.slice(0, 8));
  let selectedLabel = $derived($selectedDevice ? labelDevice($selectedDevice) : "");
  let canOpenSession = $derived(Boolean($selectedSelector) && ["closed", "stale", "error"].includes($sessionStatus.state || ""));
  let canLockSession = $derived($sessionStatus.state === "ready");

  async function refresh() {
    refreshing = true;
    try {
      await refreshDiscovery();
    } finally {
      refreshing = false;
    }
  }

  async function choose(selector: string) {
    refreshing = true;
    try {
      await selectToken(selector);
    } finally {
      refreshing = false;
    }
  }

  async function lockSession() {
    await lockSelectedSession();
  }

  async function openSession() {
    await openSelectedSession($selectedSelector);
  }

  function handleTokenChange(event: Event) {
    choose((event.currentTarget as HTMLSelectElement).value);
  }

  function openScreen(screen: string) {
    activeScreen.set(screen);
    if (screen === "overview" && $selectedSelector) {
      loadOverview($selectedSelector);
    }
  }

  function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function logTone(value: string) {
    if (value === "success") return "ok";
    if (value === "warning") return "warn";
    if (value === "error") return "bad";
    return "info";
  }

  onMount(() => {
    const offProgress = Events.On("authenticator:operation-progress", (event: any) => {
      handleOperationProgress(event.data);
    });
    const offInteraction = Events.On("authenticator:interaction-requested", (event: any) => {
      handleInteractionRequested(event.data);
    });
    const offSession = Events.On("authenticator:session-changed", (event: any) => {
      handleSessionChanged(event.data);
    });
    refreshing = true;
    bootstrap().finally(() => {
      refreshing = false;
    });
    return () => {
      offProgress?.();
      offInteraction?.();
      offSession?.();
    };
  });
</script>

<Sidebar.Provider>
  <Sidebar.Root collapsible="icon" class="border-sidebar-border bg-sidebar">
    <Sidebar.Header class="gap-3 border-b px-3 py-4">
      <div class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div class="flex aspect-square size-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <ShieldCheck size={19} strokeWidth={2.4} />
        </div>
        <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
          <span class="truncate font-semibold">FIDO Workbench</span>
          <span class="truncate text-xs text-sidebar-foreground/65">CTAP/FIDO2 console</span>
        </div>
      </div>
    </Sidebar.Header>

    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Workbench</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each screens as screen (screen.id)}
              {@const ScreenIcon = screen.icon}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  isActive={$activeScreen === screen.id}
                  onclick={() => openScreen(screen.id)}
                >
                  <ScreenIcon />
                  <span>{screen.label}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>

    <Sidebar.Footer class="p-3">
      <div class="rounded-md border border-sidebar-border bg-sidebar-accent/45 p-2 text-xs text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-primary"></span>
          <span>{sessionStateLabel($sessionStatus.state)}</span>
        </div>
      </div>
    </Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar.Root>

  <Sidebar.Inset class="min-w-0 bg-background">
    <header class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div class="grid min-h-16 grid-cols-[auto_minmax(240px,380px)_auto_minmax(280px,auto)_minmax(260px,1fr)] items-center gap-3 px-4 py-2 max-lg:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-5">
        <Sidebar.Trigger class="md:hidden" />
        <div class="grid gap-1.5">
          <label for="token-select" class="m-0 text-xs font-medium text-muted-foreground">Authenticator</label>
          <NativeSelect id="token-select" bind:value={$selectedSelector} onchange={handleTokenChange}>
            <option value="">Select token</option>
            {#each $devices as device (device.deviceId)}
              <option value={device.deviceId}>{labelDevice(device)}</option>
            {/each}
          </NativeSelect>
        </div>

        <Button variant="outline" size="icon" type="button" onclick={refresh} disabled={refreshing} aria-label="Refresh devices" title="Refresh devices">
          <RefreshCw size={17} class={refreshing ? "animate-spin" : ""} />
        </Button>

        <div class="flex min-w-0 flex-wrap items-center gap-2 max-lg:col-span-3">
          <span class="basis-full text-xs font-medium text-muted-foreground">Session</span>
          <StatusBadge value={$sessionStatus.state} label={$sessionStatus.state === "ready" ? "Open" : sessionStateLabel($sessionStatus.state)} />
          {#if canOpenSession}
            <Button variant="outline" size="sm" type="button" onclick={openSession} disabled={$sessionBusy}>
              <UnlockKeyhole size={15} />
              Open session
            </Button>
          {:else if canLockSession}
            <Button variant="outline" size="sm" type="button" onclick={lockSession}>
              <LockKeyhole size={15} />
              Lock session
            </Button>
          {/if}
        </div>

        <div class="grid grid-cols-3 gap-3 justify-self-end text-sm max-lg:col-span-3 max-lg:justify-self-stretch max-sm:grid-cols-1">
          {#if $selectedDevice}
            <div class="border-l pl-3"><span class="block text-xs text-muted-foreground">Transport</span>{$selectedDevice.transport || "unknown"}</div>
            <div class="border-l pl-3"><span class="block text-xs text-muted-foreground">VID</span>{$selectedDevice.vendorId || "n/a"}</div>
            <div class="border-l pl-3"><span class="block text-xs text-muted-foreground">PID</span>{$selectedDevice.productId || "n/a"}</div>
          {:else}
            <span class="col-span-3 text-muted-foreground">No active authenticator</span>
          {/if}
        </div>
      </div>
    </header>

    {#if $appError}
      <Alert variant="destructive" class="mx-4 mt-3 xl:mx-5">
        <AlertDescription>{$appError}</AlertDescription>
      </Alert>
    {/if}

    <div class="grid grid-cols-1 items-start gap-2 xl:grid-cols-[minmax(0,1fr)_342px]">
      <div class="min-w-0 px-4 pb-28 xl:px-5">
        <section class:hidden={$activeScreen !== "overview"}>
          <Overview />
        </section>
        <section class:hidden={$activeScreen !== "credentials"}>
          <Credentials />
        </section>
        <section class:hidden={$activeScreen !== "largeBlobs"}>
          <LargeBlobs />
        </section>
        <section class:hidden={$activeScreen !== "config"}>
          <Config />
        </section>
        <section class:hidden={$activeScreen !== "lab"}>
          <Lab />
        </section>
        <section class:hidden={$activeScreen !== "logs"}>
          <Logs />
        </section>
      </div>

      <aside class="sticky top-24 grid max-h-[calc(100vh-6.5rem)] gap-2 overflow-auto border-l p-2 pb-28 max-xl:static max-xl:max-h-none max-xl:grid-cols-2 max-xl:border-l-0 max-xl:border-t max-md:grid-cols-1" aria-label="Session and event summary">
        <Card.Root>
          <Card.Header class="flex-row items-center justify-between gap-3 pb-0">
            <Card.Title class="text-base">Event Journal</Card.Title>
            <Card.Description>latest {recentLogs.length}</Card.Description>
          </Card.Header>
          <Card.Content class="grid gap-1 pt-4">
            {#if recentLogs.length}
              {#each recentLogs as entry (entry.id)}
                <Button variant="ghost" class="h-auto justify-start gap-2 px-2 py-1.5 text-left" onclick={() => focusLogEntry(entry.id)}>
                  <span class={`size-2 rounded-full ${logTone(entry.tone) === "ok" ? "bg-success-foreground" : logTone(entry.tone) === "warn" ? "bg-warning-foreground" : logTone(entry.tone) === "bad" ? "bg-destructive" : "bg-primary"}`}></span>
                  <time class="w-[72px] shrink-0 text-xs font-normal text-muted-foreground" datetime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                  <span class="min-w-0 truncate text-xs font-medium">{entry.title}</span>
                </Button>
              {/each}
            {:else}
              <p class="m-0 text-sm text-muted-foreground">No events yet.</p>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="text-base">Session Status</Card.Title>
          </Card.Header>
          <Card.Content class="grid gap-3">
            <dl class="grid !grid-cols-1 gap-0">
              <div class="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-b py-2 first:pt-0"><dt class="text-sm text-muted-foreground">State</dt><dd class="m-0"><StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} /></dd></div>
              <div class="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-b py-2"><dt class="text-sm text-muted-foreground">Token</dt><dd class="m-0 min-w-0 break-words text-sm">{selectedLabel || "none"}</dd></div>
              <div class="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-b py-2"><dt class="text-sm text-muted-foreground">Transport</dt><dd class="m-0 text-sm">{$selectedDevice?.transport || "unknown"}</dd></div>
              <div class="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 py-2"><dt class="text-sm text-muted-foreground">Selector</dt><dd class="m-0 min-w-0"><code>{$selectedSelector || "not selected"}</code></dd></div>
            </dl>
            <Separator />
            {#if canLockSession}
              <Button variant="outline" size="sm" type="button" onclick={lockSession}>
                <LockKeyhole size={15} />
                Lock session
              </Button>
            {:else if canOpenSession}
              <Button variant="outline" size="sm" type="button" onclick={openSession} disabled={$sessionBusy}>
                <UnlockKeyhole size={15} />
                Open session
              </Button>
            {/if}
          </Card.Content>
        </Card.Root>
      </aside>
    </div>
  </Sidebar.Inset>

  <InteractionModal />
  <WorkbenchStatusBar />
  <Toaster richColors closeButton />

  <div class="fixed right-5 bottom-24 z-20 grid gap-2">
    {#each $toasts as toast (toast)}
      <div class="rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-lg">{toast}</div>
    {/each}
  </div>
</Sidebar.Provider>
