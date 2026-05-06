<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import { api } from "./lib/api";
  import { activeScreen, appError, applyDiscovery, devices, operationStatus, pendingInteraction, selectedDevice, selectedSelector, toasts } from "./lib/stores";
  import { labelDevice } from "./lib/format";
  import OperationBar from "./components/OperationBar.svelte";
  import InteractionModal from "./components/InteractionModal.svelte";
  import Overview from "./screens/Overview.svelte";
  import Credentials from "./screens/Credentials.svelte";
  import LargeBlobs from "./screens/LargeBlobs.svelte";
  import Config from "./screens/Config.svelte";
  import Lab from "./screens/Lab.svelte";

  const screens = [
    { id: "overview", label: "Overview" },
    { id: "credentials", label: "Credentials" },
    { id: "largeBlobs", label: "Large blobs" },
    { id: "config", label: "Config" },
    { id: "lab", label: "Lab" },
  ];

  let refreshing = false;

  async function refresh() {
    refreshing = true;
    applyDiscovery(await api.discover());
    refreshing = false;
  }

  async function choose(selector: string) {
    applyDiscovery(await api.select(selector));
  }

  function handleTokenChange(event: Event) {
    choose((event.currentTarget as HTMLSelectElement).value);
  }

  onMount(() => {
    const offProgress = Events.On("authenticator:operation-progress", (event: any) => {
      operationStatus.set(event.data);
      if (event.data?.event?.stage?.includes("completed") || event.data?.event?.stage?.includes("failed") || event.data?.event?.stage?.includes("canceled")) {
        setTimeout(() => operationStatus.set(null), 1800);
      }
    });
    const offInteraction = Events.On("authenticator:interaction-requested", (event: any) => {
      pendingInteraction.set(event.data);
    });
    refresh();
    return () => {
      offProgress?.();
      offInteraction?.();
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
      <button type="button" on:click={refresh} disabled={refreshing}>{refreshing ? "Refreshing" : "Refresh"}</button>
    </div>
  </header>

  <div class="device-strip">
    {#if $selectedDevice}
      <span>{labelDevice($selectedDevice)}</span>
      <code>{$selectedDevice.transport}</code>
      <code>VID {$selectedDevice.vendorId}</code>
      <code>PID {$selectedDevice.productId}</code>
    {:else}
      <span>No active authenticator. Plug in a token or refresh discovery.</span>
    {/if}
  </div>

  {#if $appError}
    <div class="notice danger">{$appError}</div>
  {/if}

  <nav class="nav-tabs" aria-label="Main sections">
    {#each screens as screen}
      <button type="button" class:active={$activeScreen === screen.id} on:click={() => activeScreen.set(screen.id)}>
        {screen.label}
      </button>
    {/each}
  </nav>

  <OperationBar />

  <main>
    {#if $activeScreen === "overview"}
      <Overview />
    {:else if $activeScreen === "credentials"}
      <Credentials />
    {:else if $activeScreen === "largeBlobs"}
      <LargeBlobs />
    {:else if $activeScreen === "config"}
      <Config />
    {:else}
      <Lab />
    {/if}
  </main>

  <InteractionModal />

  <div class="toast-stack">
    {#each $toasts as toast}
      <div class="toast">{toast}</div>
    {/each}
  </div>
</div>
