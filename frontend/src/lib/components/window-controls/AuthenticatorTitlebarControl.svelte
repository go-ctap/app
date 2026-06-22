<script lang="ts">
  import { RefreshCw, X } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { AuthenticatorTitlebarPresentation } from "$lib/shell-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: AuthenticatorTitlebarPresentation;
    onSelect: (value: string) => void | Promise<void>;
    onClear: () => void | Promise<void>;
    onRefresh: () => void | Promise<void>;
  };

  let { presentation, onSelect, onClear, onRefresh }: Props = $props();
  let localRefreshing = $state(false);

  let disabled = $derived(presentation.busy || localRefreshing);
  let clearDisabled = $derived(presentation.clearDisabled || localRefreshing);

  async function handleSelect(value: string | string[]) {
    if (Array.isArray(value)) return;
    if (value === presentation.selectedValue || disabled) return;
    await onSelect(value);
  }

  async function handleClear() {
    if (clearDisabled) return;
    await onClear();
  }

  async function handleRefresh() {
    if (disabled) return;
    localRefreshing = true;
    try {
      await onRefresh();
    } finally {
      localRefreshing = false;
    }
  }
</script>

<Tooltip.Provider delayDuration={450} skipDelayDuration={80}>
  <div class="auth-titlebar" data-busy={disabled ? "true" : undefined}>
    <Select.Root type="single" value={presentation.selectedValue} onValueChange={handleSelect} disabled={disabled} items={presentation.items}>
      <Select.Trigger aria-label={m.select_authenticator()}>
        {presentation.selectedLabel}
      </Select.Trigger>

      <Select.Portal>
        <Select.Content side="bottom" align="start" sideOffset={6}>
          <Select.Group>
            {#each presentation.items as item (item.value)}
              <Select.Item value={item.value} label={item.label}>
                <span>{item.name}</span>
                <span class="auth-item-detail">{item.detail}</span>
              </Select.Item>
            {:else}
              <Select.Label>{m.no_authenticators_connected()}</Select.Label>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Portal>
    </Select.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" type="button" aria-label={m.refresh_devices()} disabled={disabled} onclick={handleRefresh}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.refresh_devices()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" type="button" aria-label={m.clear_selection()} disabled={clearDisabled} onclick={handleClear}>
            <X data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.clear_selection()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </div>
</Tooltip.Provider>

<style>
@layer blocks {
    .auth-titlebar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      height: 100%;
      min-width: 0;
    }

    .auth-titlebar :global(button),
    .auth-titlebar :global([role="button"]) {
      --wails-draggable: no-drag;
    }

    .auth-titlebar[data-busy="true"] {
      opacity: 0.76;
    }

    .auth-item-detail {
      color: var(--muted-foreground);
    }
}
</style>
