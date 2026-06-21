<script lang="ts">
  import { onMount } from "svelte";
  import { Copy, Minus, Square, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { closeWindow, isWindowMaximized, minimizeWindow, toggleMaximizeWindow } from "./window";
  import { m } from "../../paraglide/messages.js";

  let maximized = $state(false);

  onMount(() => {
    void syncMaximized();
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

<Tooltip.Provider delayDuration={450} skipDelayDuration={80}>
  <div class="window-controls" data-window-drag-exclude aria-label={m.window_controls()}>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} class="window-controls__button" variant="ghost" data-window-region="minimize" type="button" aria-label={m.minimize_window()} onclick={handleMinimize}>
            <Minus size={15} strokeWidth={2} aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="window-controls__tooltip" side="bottom" sideOffset={7}>
          {m.minimize_window()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} class="window-controls__button" variant="ghost" data-window-region="maximize" type="button" aria-label={maximized ? m.restore_window() : m.maximize_window()} onclick={handleToggleMaximize}>
            {#if maximized}
              <Copy size={13} strokeWidth={2} aria-hidden="true" />
            {:else}
              <Square size={13} strokeWidth={2} aria-hidden="true" />
            {/if}
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="window-controls__tooltip" side="bottom" sideOffset={7}>
          {maximized ? m.restore_window() : m.maximize_window()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} class="window-controls__button" variant="ghost" data-action="close" data-window-region="close" type="button" aria-label={m.close_window()} onclick={handleClose}>
            <X size={17} strokeWidth={2} aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="window-controls__tooltip" side="bottom" sideOffset={7}>
          {m.close_window()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </div>
</Tooltip.Provider>

<style>
@layer blocks {
    .window-controls {
      display: flex;
      align-items: stretch;
      height: 100%;
      min-width: max-content;
      color: var(--muted-foreground);
    }

    :global(.window-controls__button) {
      width: 46px;
      height: 100%;
      min-height: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      padding: 0;
    }

    :global(.window-controls__button[data-window-region="minimize"]) {
      --wails-non-client-region: minimize;
    }

    :global(.window-controls__button[data-window-region="maximize"]) {
      --wails-non-client-region: maximize;
    }

    :global(.window-controls__button[data-window-region="close"]) {
      --wails-non-client-region: close;
    }

    :global(.window-controls__button:hover:not(:disabled)) {
      background: color-mix(in srgb, var(--foreground) 7%, transparent);
      color: var(--foreground);
    }

    :global(.window-controls__button[data-action="close"]:hover:not(:disabled)) {
      background: var(--destructive);
      color: white;
    }

    :global(.window-controls__tooltip) {
      z-index: 80;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--popover);
      color: var(--foreground);
      padding: 5px 7px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
      font-size: 0.72rem;
      line-height: 1.2;
    }
}
</style>
