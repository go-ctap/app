<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Kbd from "$lib/components/ui/kbd/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    position: number;
    total: number;
    canPrevious: boolean;
    canNext: boolean;
    onPrevious?: () => void;
    onNext?: () => void;
  };

  let {
    position,
    total,
    canPrevious,
    canNext,
    onPrevious = () => undefined,
    onNext = () => undefined,
  }: Props = $props();
</script>

<nav class="log-detail-navigation" aria-label={m.logs_navigation()}>
  <span class="log-detail-position" aria-live="polite">
    {m.logs_entry_position({ current: position, total })}
  </span>
  <Tooltip.Provider delayDuration={350} skipDelayDuration={80}>
    <div class="log-detail-actions">
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canPrevious}
              aria-label={m.logs_previous_entry()}
              aria-keyshortcuts="Alt+ArrowUp"
              onclick={onPrevious}
            >
              <ChevronUp data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={6}>
          <span class="log-detail-shortcut">
            {m.logs_previous_entry()}
            <Kbd.Group aria-hidden="true">
              <Kbd.Root>Alt</Kbd.Root>
              <span>+</span>
              <Kbd.Root>↑</Kbd.Root>
            </Kbd.Group>
          </span>
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canNext}
              aria-label={m.logs_next_entry()}
              aria-keyshortcuts="Alt+ArrowDown"
              onclick={onNext}
            >
              <ChevronDown data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={6}>
          <span class="log-detail-shortcut">
            {m.logs_next_entry()}
            <Kbd.Group aria-hidden="true">
              <Kbd.Root>Alt</Kbd.Root>
              <span>+</span>
              <Kbd.Root>↓</Kbd.Root>
            </Kbd.Group>
          </span>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </Tooltip.Provider>
</nav>

<style>
  @layer blocks {
    .log-detail-navigation,
    .log-detail-actions,
    .log-detail-shortcut {
      display: flex;
      align-items: center;
    }

    .log-detail-navigation {
      flex: 0 0 auto;
      justify-content: flex-end;
      gap: var(--space-2);
      min-height: 2.5rem;
      padding: 0 var(--space-3) 0 var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .log-detail-actions {
      gap: var(--space-1);
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }

    .log-detail-position {
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      font-size: 0.7rem;
    }

    .log-detail-shortcut {
      gap: var(--space-2);
    }
  }
</style>
