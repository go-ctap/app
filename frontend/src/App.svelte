<script lang="ts">
  import { onMount } from "svelte";
  import { Events } from "@wailsio/runtime";
  import { ShieldCheck, X } from "@lucide/svelte";
  import type * as kitservice from "../bindings/github.com/go-ctap/kit/service/models";
  import {
    bootstrap,
    handleInteractionRequested,
    handleOperationProgress,
    shutdownWorkbench,
  } from "$lib/controller";
  import {
    activeScreen,
    appError,
    devices,
    selectedDevice,
    sessionStatus,
    statusBar,
    toasts,
    type ActiveScreen,
  } from "$lib/stores";
  import { currentLocale } from "$lib/i18n";
  import { m } from "./paraglide/messages.js";
  import AppSidebar from "./components/AppSidebar.svelte";
  import InteractionModal from "./components/InteractionModal.svelte";
  import { WindowTitlebar } from "./components/window-controls";
  import Overview from "./screens/Overview.svelte";
  import Settings from "./screens/Settings.svelte";

  type WailsDataEvent<T> = { data: T };

  let refreshing = $state(false);
  let initialized = $state(false);
  let noDevices = $derived(initialized && !refreshing && $devices.length === 0);

  function navigate(screen: ActiveScreen) {
    activeScreen.set(screen);
  }

  function dismissToast(index: number) {
    toasts.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  onMount(() => {
    activeScreen.set("overview");

    const offProgress = Events.On("ctapkit:operation-event", (event: WailsDataEvent<kitservice.OperationEventEnvelope>) => {
      handleOperationProgress(event.data);
    });
    const offInteraction = Events.On("ctapkit:interaction-requested", (event: WailsDataEvent<kitservice.InteractionPrompt>) => {
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
      void shutdownWorkbench();
    };
  });
</script>

{#key $currentLocale}
  <div class="app-shell">
    <AppSidebar
      activeScreen={$activeScreen}
      sessionStatus={$sessionStatus}
      selectedDevice={$selectedDevice}
      statusBar={$statusBar}
      onNavigate={navigate}
    />

    <section class="app-workspace">
      <header class="app-header">
        <WindowTitlebar class="titlebar-content" nativeWindowControlsOverlay={false} />
      </header>

      {#if $appError}
        <div class="app-alert" role="alert">{$appError}</div>
      {/if}

      <main class="main-view">
        {#if $activeScreen === "settings"}
          <Settings />
        {:else if noDevices}
          <section class="empty-workbench" aria-label={m.no_authenticators_connected()}>
            <ShieldCheck size={34} strokeWidth={1.8} />
            <h1>{m.no_authenticators_connected()}</h1>
            <p>{m.no_authenticators_connected_message()}</p>
          </section>
        {:else}
          <Overview />
        {/if}
      </main>
    </section>

    <InteractionModal />

    <div class="toast-stack flow" aria-live="polite">
      {#each $toasts as toast, index (`${index}:${toast}`)}
        <div class="toast">
          <span>{toast}</span>
          <button class="toast__dismiss" type="button" aria-label={m.close()} onclick={() => dismissToast(index)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      {/each}
    </div>
  </div>
{/key}

<style>
@layer blocks {
    .app-shell {
      display: grid;
      grid-template-columns: 16rem minmax(0, 1fr);
      min-width: 0;
      height: 100vh;
      background: var(--color-bg);
      color: var(--color-text);
    }

    .app-workspace {
      display: grid;
      grid-template-rows: 58px minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
    }

    .app-header {
      z-index: 10;
      min-width: 0;
      border-bottom: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-panel) 92%, transparent);
      box-shadow: var(--shadow-hairline);
    }

    :global(.titlebar-content) {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      place-items: center;
      align-items: center;
      height: 58px;
      min-width: 0;
      padding: 0 var(--space-4);
    }

    .main-view {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      padding: var(--space-4);
    }

    .app-alert {
      position: fixed;
      top: 70px;
      right: var(--space-4);
      left: calc(16rem + var(--space-4));
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

    .toast__dismiss {
      width: 24px;
      height: 24px;
      min-height: 24px;
      flex: 0 0 auto;
      padding: 0;
    }

    @media (max-width: 900px) {
      .app-shell {
        grid-template-columns: 5rem minmax(0, 1fr);
      }

      .app-alert {
        left: calc(5rem + var(--space-4));
      }
    }
}
</style>
