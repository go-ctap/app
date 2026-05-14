<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import Router, { router, type RouteDefinition, type RouteDetailLoaded } from "svelte-spa-router";
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
    loadOverview,
    refreshDiscovery,
    selectToken,
  } from "$lib/controller";
  import {
    activeScreen,
    appError,
    devices,
    selectedSelector,
    sessions,
    sessionStatus,
    toasts,
  } from "$lib/stores";
  import {
    DEFAULT_WORKBENCH_SCREEN,
    DEFAULT_WORKBENCH_ROUTE,
    WORKBENCH_ROUTES,
    WORKBENCH_SCREEN_META,
    WORKBENCH_SCREEN_ORDER,
    navigateToScreen,
    screenFromPath,
    type WorkbenchScreenId,
  } from "$lib/navigation";
  import { sessionStateLabel } from "$lib/format";
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";
  import { m } from "./paraglide/messages.js";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as NativeSelect from "$lib/components/ui/native-select/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import InteractionModal from "./components/InteractionModal.svelte";
  import NavActivityFooter from "./components/NavActivityFooter.svelte";
  import RouteRedirect from "./components/RouteRedirect.svelte";
  import TokenSelect from "./components/TokenSelect.svelte";
  import TopSessionControls from "./components/TopSessionControls.svelte";
  import { WindowTitlebar } from "./components/window-controls";
  import Overview from "./screens/Overview.svelte";
  import Credentials from "./screens/Credentials.svelte";
  import LargeBlobs from "./screens/LargeBlobs.svelte";
  import Config from "./screens/Config.svelte";
  import Lab from "./screens/Lab.svelte";
  import Logs from "./screens/Logs.svelte";

  const routeComponents = {
    overview: Overview,
    credentials: Credentials,
    largeBlobs: LargeBlobs,
    config: Config,
    lab: Lab,
    logs: Logs,
  };

  const routes: RouteDefinition = {
    "/": RouteRedirect,
    [WORKBENCH_ROUTES.overview]: routeComponents.overview,
    [WORKBENCH_ROUTES.credentials]: routeComponents.credentials,
    [WORKBENCH_ROUTES.largeBlobs]: routeComponents.largeBlobs,
    [WORKBENCH_ROUTES.config]: routeComponents.config,
    [WORKBENCH_ROUTES.lab]: routeComponents.lab,
    [WORKBENCH_ROUTES.logs]: routeComponents.logs,
    "*": RouteRedirect,
  };

  const screenIcons: Record<WorkbenchScreenId, any> = {
    overview: LayoutDashboard,
    credentials: KeyRound,
    largeBlobs: Database,
    config: Settings2,
    lab: FlaskConical,
    logs: ScrollText,
  };

  const screens = WORKBENCH_SCREEN_ORDER.map((id) => ({
    ...WORKBENCH_SCREEN_META[id],
    icon: screenIcons[id],
  }));

  let refreshing = $state(false);
  let initialized = $state(false);
  let scrollY = $state(0);
  let mainViewport = $state<HTMLElement | null>(null);
  let noDevices = $derived(initialized && !refreshing && $devices.length === 0);
  let activeRouteScreen = $derived(screenFromPath(router.location) || DEFAULT_WORKBENCH_SCREEN);
  let sessionLabel = $derived(sessionStateLabel($sessionStatus.state));
  let labAvailable = $derived($sessionStatus.state === "ready");
  let topBarScrolled = $derived(scrollY > 2);
  let previousRouteScreen: WorkbenchScreenId | "" = "";

  async function refresh() {
    refreshing = true;
    try {
      await refreshDiscovery();
    } finally {
      refreshing = false;
      initialized = true;
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

  function handleRouteLoaded(detail: RouteDetailLoaded) {
    const screen = screenFromPath(detail.location) || DEFAULT_WORKBENCH_SCREEN;
    const selector = $selectedSelector;
    activeScreen.set(screen);

    if (screen === "overview" && selector && previousRouteScreen && previousRouteScreen !== "overview") {
      void loadOverview(selector);
    }

    previousRouteScreen = screen;
  }

  $effect(() => {
    const node = mainViewport;
    if (!node) return;

    const updateScroll = () => {
      scrollY = node.scrollTop;
    };

    updateScroll();
    node.addEventListener("scroll", updateScroll);
    return () => node.removeEventListener("scroll", updateScroll);
  });

  onMount(() => {
    if (!screenFromPath(router.location) && router.location !== DEFAULT_WORKBENCH_ROUTE) {
      void navigateToScreen(DEFAULT_WORKBENCH_SCREEN, { replace: true });
    }

    const offProgress = Events.On("ctapkit:operation-event", (event: any) => {
      handleOperationProgress(event.data);
    });
    const offInteraction = Events.On("ctapkit:interaction-requested", (event: any) => {
      handleInteractionRequested(event.data);
    });
    refreshing = true;
    bootstrap().finally(() => {
      refreshing = false;
      initialized = true;
    });
    return () => {
      offProgress?.();
      offInteraction?.();
    };
  });
</script>

{#key $currentLocale}
<Sidebar.Provider style="--sidebar-width: 15rem; --sidebar-width-mobile: 18rem;">
  <Sidebar.Root collapsible="icon">
    <Sidebar.Header class="h-16 justify-center border-b bg-background px-4 py-0">
      <div class="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center">
        <div class="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck size={17} strokeWidth={2.25} />
        </div>
        <div class="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span class="truncate text-sm font-semibold">{m.app_title()}</span>
          <span class="truncate text-xs text-sidebar-foreground/60">{m.app_subtitle()}</span>
        </div>
      </div>
    </Sidebar.Header>

    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>{m.nav_group_workbench()}</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each screens as screen (screen.id)}
              {@const ScreenIcon = screen.icon}
              {@const screenDisabled = screen.id === "lab" && !labAvailable}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  isActive={activeRouteScreen === screen.id}
                  disabled={screenDisabled}
                  aria-disabled={screenDisabled}
                  onclick={() => {
                    if (!screenDisabled) navigateToScreen(screen.id);
                  }}
                  tooltipContent={screen.label()}
                >
                  <ScreenIcon />
                  <span>{screen.label()}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer class="border-t bg-background/70">
      <NavActivityFooter />
    </Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar.Root>

  <Sidebar.Inset class="min-w-0 bg-background">
    <header
      class={[
        "sticky top-0 z-20 h-16 border-b transition-[background-color,box-shadow,backdrop-filter] duration-200",
        topBarScrolled
          ? "border-border/70 bg-background/80 shadow-xs supports-backdrop-filter:backdrop-blur-md"
          : "bg-background"
      ]}
    >
      <WindowTitlebar class="h-16 min-w-0 items-center gap-2 px-4" windowControlsProps={{ class: "shrink-0" }}>
        <div class="min-w-0 flex-1 sm:max-w-[32rem]" data-window-drag-exclude>
          <TokenSelect
            devices={$devices}
            sessions={$sessions}
            value={$selectedSelector}
            disabled={refreshing}
            sessionState={$sessionStatus.state}
            sessionLabel={sessionLabel}
            onSelect={choose}
          />
        </div>

        <Button data-window-drag-exclude variant="outline" size="icon-lg" class="size-11" type="button" onclick={refresh} disabled={refreshing} aria-label={m.refresh_devices()} title={m.refresh_devices()}>
          <RefreshCw size={16} class={refreshing ? "animate-spin" : ""} />
        </Button>

        <div class="min-w-0 flex-1"></div>

        <div class="min-w-0 justify-end" data-window-drag-exclude>
          <TopSessionControls />
        </div>

        <NativeSelect.Root class="w-auto min-w-24 [&_select]:h-11" value={$currentLocale} onchange={(event) => setAppLocale((event.currentTarget as HTMLSelectElement).value)} aria-label={m.language()} data-window-drag-exclude>
          {#each availableLocales as locale (locale)}
            <NativeSelect.Option value={locale}>{localeLabel(locale)}</NativeSelect.Option>
          {/each}
        </NativeSelect.Root>
      </WindowTitlebar>
    </header>

    {#if $appError}
      <Alert variant="destructive" class="mx-4 mt-4">
        <AlertDescription>{$appError}</AlertDescription>
      </Alert>
    {/if}

    <ScrollArea bind:viewportRef={mainViewport} class="h-[calc(100vh-4rem)] min-w-0" scrollbarYClasses="z-30">
      <main class="min-w-0 px-4 py-4">
        {#if noDevices}
          <section class="grid h-[calc(100vh-8rem)] place-items-center" aria-label={m.no_authenticators_connected()}>
            <Empty.Root class="from-muted/50 to-background h-full w-full bg-gradient-to-b from-30%">
              <Empty.Header>
                <Empty.Media variant="icon" aria-hidden="true">
                  <ShieldCheck />
                </Empty.Media>
                <Empty.Title>{m.no_authenticators_connected()}</Empty.Title>
                <Empty.Description>{m.no_authenticators_connected_message()}</Empty.Description>
              </Empty.Header>
            </Empty.Root>
          </section>
        {:else}
          <section class="min-w-0" aria-label={WORKBENCH_SCREEN_META[activeRouteScreen].label()}>
            <Router {routes} onRouteLoaded={handleRouteLoaded} />
          </section>
        {/if}
      </main>
    </ScrollArea>
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
{/key}
