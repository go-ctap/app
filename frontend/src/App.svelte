<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import { bootstrap, handleInteractionRequested, handleOperationProgress, handleSessionChanged, loadOverview, lockSelectedSession, openSelectedSession, refreshDiscovery, selectToken } from "./lib/controller";
  import { activeScreen, appError, devices, selectedDevice, selectedSelector, sessionBusy, sessionStatus, toasts } from "./lib/stores";
  import { labelDevice, sessionStateLabel } from "./lib/format";
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
    { id: "overview", label: "Overview" },
    { id: "credentials", label: "Credentials" },
    { id: "largeBlobs", label: "Large blobs" },
    { id: "config", label: "Config" },
    { id: "lab", label: "Lab" },
    { id: "logs", label: "Logs" },
  ];

  let refreshing = false;

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

<div class="app-shell">
  <header class="top-bar">
    <div class="brand">
      <span class="brand-mark">F</span>
      <div>
        <strong>FIDO Workbench</strong>
        <span>CTAP/FIDO2 authenticator manager</span>
      </div>
    </div>

    <div class="token-picker">
      <label for="token-select">Token</label>
      <select id="token-select" bind:value={$selectedSelector} on:change={handleTokenChange}>
        <option value="">Select token</option>
        {#each $devices as device}
          <option value={device.deviceId}>{labelDevice(device)}</option>
        {/each}
      </select>
      <button type="button" on:click={refresh} disabled={refreshing}>{refreshing ? "Refreshing devices" : "Refresh devices"}</button>
    </div>
  </header>

  <div class="device-strip">
    {#if $selectedDevice}
      <span class="device-name">{labelDevice($selectedDevice)}</span>
      <code>{$selectedDevice.transport}</code>
      <code>VID {$selectedDevice.vendorId}</code>
      <code>PID {$selectedDevice.productId}</code>
      <StatusBadge value={$sessionStatus.state} label={$sessionStatus.state === "ready" ? "session cached" : sessionStateLabel($sessionStatus.state)} />
      {#if $sessionStatus.state === "closed" || $sessionStatus.state === "stale" || $sessionStatus.state === "error"}
        <button class="quiet compact" type="button" on:click={openSession} disabled={$sessionBusy}>Open session</button>
      {:else if $sessionStatus.state === "ready"}
        <button class="quiet compact" type="button" on:click={lockSession}>Lock session</button>
      {/if}
    {:else}
      <span>No active authenticator. Plug in a token or refresh discovery.</span>
    {/if}
  </div>

  {#if $appError}
    <div class="notice danger">{$appError}</div>
  {/if}

  <nav class="nav-tabs" aria-label="Main sections">
    {#each screens as screen}
      <button type="button" class:active={$activeScreen === screen.id} on:click={() => openScreen(screen.id)}>
        {screen.label}
      </button>
    {/each}
  </nav>

  <main>
    <section class:hidden-screen={$activeScreen !== "overview"} class="screen-pane">
      <Overview />
    </section>
    <section class:hidden-screen={$activeScreen !== "credentials"} class="screen-pane">
      <Credentials />
    </section>
    <section class:hidden-screen={$activeScreen !== "largeBlobs"} class="screen-pane">
      <LargeBlobs />
    </section>
    <section class:hidden-screen={$activeScreen !== "config"} class="screen-pane">
      <Config />
    </section>
    <section class:hidden-screen={$activeScreen !== "lab"} class="screen-pane">
      <Lab />
    </section>
    <section class:hidden-screen={$activeScreen !== "logs"} class="screen-pane">
      <Logs />
    </section>
  </main>

  <InteractionModal />
  <WorkbenchStatusBar />

  <div class="toast-stack">
    {#each $toasts as toast}
      <div class="toast">{toast}</div>
    {/each}
  </div>
</div>
