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
          <Button
            {...props}
            class="h-full min-h-0 w-[46px] rounded-none border-0 bg-transparent p-0 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            variant="ghost"
            style="--wails-non-client-region: minimize"
            data-window-region="minimize"
            type="button"
            aria-label={m.minimize_window()}
            onclick={handleMinimize}
          >
            <Minus aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.minimize_window()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            class="h-full min-h-0 w-[46px] rounded-none border-0 bg-transparent p-0 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            variant="ghost"
            style="--wails-non-client-region: maximize"
            data-window-region="maximize"
            type="button"
            aria-label={maximized ? m.restore_window() : m.maximize_window()}
            onclick={handleToggleMaximize}
          >
            {#if maximized}
              <Copy aria-hidden="true" />
            {:else}
              <Square aria-hidden="true" />
            {/if}
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {maximized ? m.restore_window() : m.maximize_window()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            class="h-full min-h-0 w-[46px] rounded-none border-0 bg-transparent p-0 text-muted-foreground hover:bg-destructive hover:text-background"
            variant="ghost"
            style="--wails-non-client-region: close"
            data-action="close"
            data-window-region="close"
            type="button"
            aria-label={m.close_window()}
            onclick={handleClose}
          >
            <X aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
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
    }
}
</style>
