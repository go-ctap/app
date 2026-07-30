<script lang="ts">
  import { Events } from "@wailsio/runtime";
  import { onMount } from "svelte";

  import {
    closeWindow,
    isWindowMaximized,
    minimizeWindow,
    toggleMaximizeWindow,
  } from "$lib/window-controller.js";

  import { m } from "../../../paraglide/messages.js";
  import Icons from "$lib/components/window-controls/Icons.svelte";
  import WindowControlButton from "$lib/components/window-controls/WindowControlButton.svelte";

  let maximized = $state(false);

  onMount(() => {
    void syncMaximized();

    const offMaximise = Events.On(Events.Types.Common.WindowMaximise, () => {
      maximized = true;
    });
    const offUnMaximise = Events.On(Events.Types.Common.WindowUnMaximise, () => {
      maximized = false;
    });
    const offRestore = Events.On(Events.Types.Common.WindowRestore, () => {
      maximized = false;
    });
    const offRuntimeReady = Events.On(Events.Types.Common.WindowRuntimeReady, () => {
      void syncMaximized();
    });

    return () => {
      offMaximise();
      offUnMaximise();
      offRestore();
      offRuntimeReady();
    };
  });

  async function syncMaximized() {
    try {
      maximized = await isWindowMaximized();
    } catch {
      // runtimeCall records the failure; keep the last known native state.
    }
  }

  async function handleToggleMaximize() {
    await toggleMaximizeWindow();
    await syncMaximized();
  }
</script>

<div class="window-controls" aria-label={m.window_controls()}>
  <WindowControlButton label={m.minimize()} region="minimize" onclick={() => void minimizeWindow()}>
    <Icons icon="minimizeWin" aria-hidden="true" />
  </WindowControlButton>

  <WindowControlButton
    label={maximized ? m.restore() : m.maximize()}
    region="maximize"
    onclick={handleToggleMaximize}
  >
    {#if maximized}
      <Icons icon="maximizeRestoreWin" aria-hidden="true" />
    {:else}
      <Icons icon="maximizeWin" aria-hidden="true" />
    {/if}
  </WindowControlButton>

  <WindowControlButton
    label={m.close()}
    region="close"
    action="close"
    onclick={() => void closeWindow()}
  >
    <Icons icon="closeWin" aria-hidden="true" />
  </WindowControlButton>
</div>

<style>
  @layer blocks {
    .window-controls {
      display: flex;
      align-items: stretch;
      height: 100%;
      min-width: max-content;
    }
  }
</style>
