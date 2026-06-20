<script lang="ts">
  import { onMount } from "svelte";
  import { Events, System } from "@wailsio/runtime";
  import { RefreshCw, ShieldCheck, X } from "@lucide/svelte";
  import {
    bootstrap,
    handleInteractionRequested,
    handleOperationProgress,
    refreshDiscovery,
    selectToken,
  } from "$lib/controller";
  import {
    activeScreen,
    appError,
    devices,
    selectedSelector,
    sessionBusy,
    sessionStatus,
    toasts,
  } from "$lib/stores";
  import { sessionStateLabel } from "$lib/format";
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";
  import { m } from "./paraglide/messages.js";
  import InteractionModal from "./components/InteractionModal.svelte";
  import TokenSelect from "./components/TokenSelect.svelte";
  import { WindowTitlebar } from "./components/window-controls";
  import Overview from "./screens/Overview.svelte";

  const useWindowControlsOverlay = System.IsWindows();

  let refreshing = $state(false);
  let initialized = $state(false);
  let noDevices = $derived(initialized && !refreshing && $devices.length === 0);
  let sessionLabel = $derived(sessionStateLabel($sessionStatus.state));

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

  onMount(() => {
    activeScreen.set("overview");

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
  <div class="app-shell">
    <header class="app-header">
      <WindowTitlebar
        class="titlebar-content"
        nativeWindowControlsOverlay={useWindowControlsOverlay}
      >
        <div class="brand" aria-label={m.app_title()}>
          <span class="brand-mark" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.25} />
          </span>
          <span class="brand-copy">
            <span class="brand-title">{m.app_title()}</span>
            <span class="brand-subtitle">{m.app_subtitle()}</span>
          </span>
        </div>

        <div class="device-picker" data-window-drag-exclude>
          <TokenSelect
            devices={$devices}
            value={$selectedSelector}
            disabled={refreshing || $sessionBusy}
            sessionState={$sessionStatus.state}
            sessionLabel={sessionLabel}
            onSelect={choose}
          />
        </div>

        <button
          class="icon-button"
          data-window-drag-exclude
          type="button"
          onclick={refresh}
          disabled={refreshing}
          aria-label={m.refresh_devices()}
          title={m.refresh_devices()}
        >
          <RefreshCw size={16} class={refreshing ? "u-spin" : undefined} />
        </button>

        <div class="header-spacer"></div>

        <select
          class="locale-select"
          value={$currentLocale}
          onchange={(event) => setAppLocale((event.currentTarget as HTMLSelectElement).value)}
          aria-label={m.language()}
          data-window-drag-exclude
        >
          {#each availableLocales as locale (locale)}
            <option value={locale}>{localeLabel(locale)}</option>
          {/each}
        </select>
      </WindowTitlebar>
    </header>

    {#if $appError}
      <div class="app-alert" role="alert">{$appError}</div>
    {/if}

    <main class="main-view">
      {#if noDevices}
        <section class="empty-workbench" aria-label={m.no_authenticators_connected()}>
          <ShieldCheck size={34} strokeWidth={1.8} />
          <h1>{m.no_authenticators_connected()}</h1>
          <p>{m.no_authenticators_connected_message()}</p>
        </section>
      {:else}
        <Overview />
      {/if}
    </main>

    <InteractionModal />

    <div class="toast-stack flow" aria-live="polite">
      {#each $toasts as toast (toast)}
        <div class="toast">
          <span>{toast}</span>
          <X size={14} />
        </div>
      {/each}
    </div>
  </div>
{/key}

<style>
  .app-shell {
    display: grid;
    grid-template-rows: 64px minmax(0, 1fr);
    min-width: 0;
    height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .app-header {
    z-index: 10;
    min-width: 0;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-panel) 92%, transparent);
    box-shadow: var(--shadow-hairline);
  }

  :global(.titlebar-content) {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 64px;
    min-width: 0;
    padding: 0 var(--space-4);
  }

  .brand {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: var(--space-2);
    align-items: center;
    min-width: 190px;
  }

  .brand-mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-control);
    background: var(--color-text);
    color: var(--color-panel);
  }

  .brand-copy {
    display: grid;
    min-width: 0;
    line-height: 1.15;
  }

  .brand-title,
  .brand-subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-title {
    font-size: 0.9rem;
    font-weight: 700;
  }

  .brand-subtitle {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .device-picker {
    width: min(35vw, 30rem);
    min-width: 18rem;
  }

  .header-spacer {
    flex: 1 1 auto;
    min-width: var(--space-2);
  }

  .locale-select {
    height: 36px;
    min-width: 6rem;
  }

  .main-view {
    min-width: 0;
    overflow: auto;
    padding: var(--space-4);
  }

  .app-alert {
    position: fixed;
    top: 76px;
    right: var(--space-4);
    left: var(--space-4);
    z-index: 20;
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-panel);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
    padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-panel);
  }

  .empty-workbench {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-2);
    min-height: calc(100vh - 8rem);
    color: var(--color-text-muted);
    text-align: center;
  }

  .empty-workbench h1 {
    margin: var(--space-2) 0 0;
    color: var(--color-text);
    font-size: 1.15rem;
  }

  .empty-workbench p {
    max-width: 34rem;
    margin: 0;
    line-height: 1.55;
  }

  .icon-button {
    width: 36px;
    height: 36px;
  }

  .toast-stack {
    position: fixed;
    right: var(--space-4);
    bottom: var(--space-4);
    z-index: 30;
    display: grid;
    gap: var(--space-2);
    max-width: min(24rem, calc(100vw - 2rem));
  }

  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-popover);
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    box-shadow: var(--shadow-panel);
    font-size: 0.875rem;
  }

  @media (max-width: 900px) {
    .brand-copy {
      display: none;
    }

    .brand {
      min-width: 34px;
      grid-template-columns: 34px;
    }

    .device-picker {
      width: auto;
      min-width: 12rem;
      flex: 1 1 auto;
    }
  }
</style>
