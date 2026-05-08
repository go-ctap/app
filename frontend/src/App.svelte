<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import {
    Database,
    FlaskConical,
    KeyRound,
    LayoutDashboard,
    RefreshCw,
    ScrollText,
    Settings2,
    ShieldCheck,
    X,
  } from "@lucide/svelte";
  import {
    bootstrap,
    handleInteractionRequested,
    handleOperationProgress,
    handleSessionChanged,
    loadOverview,
    refreshDiscovery,
    selectToken,
  } from "./lib/controller";
  import {
    activeScreen,
    appError,
    devices,
    selectedSelector,
    toasts,
  } from "./lib/stores";
  import { labelDevice } from "./lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { NativeSelect } from "$lib/components/ui/native-select/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import ActivityRail from "./components/ActivityRail.svelte";
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
  let activeScreenLabel = $derived(screens.find((screen) => screen.id === $activeScreen)?.label || "Overview");

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

  function handleTokenChange(event: Event) {
    choose((event.currentTarget as HTMLSelectElement).value);
  }

  function openScreen(screen: string) {
    activeScreen.set(screen);
    if (screen === "overview" && $selectedSelector) {
      loadOverview($selectedSelector);
    }
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

<Sidebar.Provider style="--sidebar-width: 15rem; --sidebar-width-mobile: 18rem;">
  <Sidebar.Root collapsible="icon">
    <Sidebar.Header class="border-b px-2 py-3">
      <div class="flex min-w-0 items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div class="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck size={17} strokeWidth={2.25} />
        </div>
        <div class="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span class="truncate text-sm font-semibold">FIDO Workbench</span>
          <span class="truncate text-xs text-sidebar-foreground/60">Local CTAP console</span>
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
    <Sidebar.Rail />
  </Sidebar.Root>

  <Sidebar.Inset class="min-w-0 bg-background">
    <header class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div class="flex min-h-14 flex-wrap items-center gap-2 px-3 py-2 lg:flex-nowrap lg:px-4">
        <Sidebar.Trigger class="md:hidden">
        </Sidebar.Trigger>

        <div class="min-w-0 flex-1 lg:max-w-[360px]">
          <label for="token-select" class="sr-only">Authenticator</label>
          <NativeSelect id="token-select" bind:value={$selectedSelector} onchange={handleTokenChange} aria-label="Authenticator">
            <option value="">Select authenticator</option>
            {#each $devices as device (device.deviceId)}
              <option value={device.deviceId}>{labelDevice(device)}</option>
            {/each}
          </NativeSelect>
        </div>

        <Button variant="outline" size="icon" type="button" onclick={refresh} disabled={refreshing} aria-label="Refresh devices" title="Refresh devices">
          <RefreshCw size={16} class={refreshing ? "animate-spin" : ""} />
        </Button>

        <div class="flex flex-1 justify-end xl:hidden">
          <ActivityRail variant="sheet" />
        </div>
      </div>
    </header>

    {#if $appError}
      <Alert variant="destructive" class="mx-4 mt-4">
        <AlertDescription>{$appError}</AlertDescription>
      </Alert>
    {/if}

    <main class="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="min-w-0">
        <section class:hidden={$activeScreen !== "overview"} aria-label={activeScreenLabel}>
          <Overview />
        </section>
        <section class:hidden={$activeScreen !== "credentials"} aria-label={activeScreenLabel}>
          <Credentials />
        </section>
        <section class:hidden={$activeScreen !== "largeBlobs"} aria-label={activeScreenLabel}>
          <LargeBlobs />
        </section>
        <section class:hidden={$activeScreen !== "config"} aria-label={activeScreenLabel}>
          <Config />
        </section>
        <section class:hidden={$activeScreen !== "lab"} aria-label={activeScreenLabel}>
          <Lab />
        </section>
        <section class:hidden={$activeScreen !== "logs"} aria-label={activeScreenLabel}>
          <Logs />
        </section>
      </div>
      <ActivityRail />
    </main>
  </Sidebar.Inset>

  <InteractionModal />
  <Toaster closeButton />

  <div class="fixed right-4 bottom-4 z-20 grid gap-2">
    {#each $toasts as toast (toast)}
      <div class="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
        <span>{toast}</span>
        <X size={14} class="text-muted-foreground" />
      </div>
    {/each}
  </div>
</Sidebar.Provider>
