<script lang="ts">
  import { Events } from "@wailsio/runtime";
  import { onMount } from "svelte";

  import { m } from "../../../paraglide/messages.js";
  import Icons from "./Icons.svelte";
  import { closeWindow, isWindowMaximized, minimizeWindow, toggleMaximizeWindow } from "./window";
  import WindowControlButton from "./WindowControlButton.svelte";

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

    return () => {
      offMaximise();
      offUnMaximise();
      offRestore();
    };
  });

  async function syncMaximized() {
    try {
      maximized = await isWindowMaximized();
    } catch {
      maximized = false;
    }
  }

  async function handleMinimize() {
    await minimizeWindow();
  }

  async function handleToggleMaximize() {
    await toggleMaximizeWindow();
    await syncMaximized();
  }

  async function handleClose() {
    await closeWindow();
  }
</script>

<div class="window-controls" aria-label={m.window_controls()}>
  <WindowControlButton label={m.minimize()} region="minimize" onclick={handleMinimize}>
    <Icons icon="minimizeWin" aria-hidden="true" />
  </WindowControlButton>

  <WindowControlButton label={maximized ? m.restore() : m.maximize()} region="maximize" onclick={handleToggleMaximize}>
    {#if maximized}
      <Icons icon="maximizeRestoreWin" aria-hidden="true" />
    {:else}
      <Icons icon="maximizeWin" aria-hidden="true" />
    {/if}
  </WindowControlButton>

  <WindowControlButton label={m.close()} region="close" action="close" onclick={handleClose}>
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
