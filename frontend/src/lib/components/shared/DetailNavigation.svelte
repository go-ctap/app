<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button";
  import * as Kbd from "$lib/components/ui/kbd";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { windowPlatform } from "$lib/window-platform";

  type Props = {
    navigationLabel: string;
    positionLabel: string;
    previousLabel: string;
    nextLabel: string;
    canPrevious: boolean;
    canNext: boolean;
    shortcutsEnabled: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };

  let {
    navigationLabel,
    positionLabel,
    previousLabel,
    nextLabel,
    canPrevious,
    canNext,
    shortcutsEnabled,
    onPrevious,
    onNext,
  }: Props = $props();

  let isMacOS = $derived($windowPlatform === "macos");

  function isEditableTarget(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    );
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (
      !shortcutsEnabled ||
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (canPrevious) onPrevious();

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (canNext) onNext();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<nav class="detail-navigation" aria-label={navigationLabel}>
  <span class="detail-navigation-position" aria-live="polite">{positionLabel}</span>
  <Tooltip.Provider delayDuration={350} skipDelayDuration={80}>
    <div class="detail-navigation-actions">
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canPrevious}
              aria-label={previousLabel}
              aria-keyshortcuts="Alt+ArrowUp"
              onclick={onPrevious}
            >
              <ChevronUp data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={6}>
          <span class="detail-navigation-shortcut">
            {previousLabel}
            <Kbd.Group aria-hidden="true">
              <Kbd.Root>{isMacOS ? "⌥" : "Alt"}</Kbd.Root>
              {#if !isMacOS}<span>+</span>{/if}
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
              aria-label={nextLabel}
              aria-keyshortcuts="Alt+ArrowDown"
              onclick={onNext}
            >
              <ChevronDown data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" sideOffset={6}>
          <span class="detail-navigation-shortcut">
            {nextLabel}
            <Kbd.Group aria-hidden="true">
              <Kbd.Root>{isMacOS ? "⌥" : "Alt"}</Kbd.Root>
              {#if !isMacOS}<span>+</span>{/if}
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
    .detail-navigation,
    .detail-navigation-actions,
    .detail-navigation-shortcut {
      display: flex;
      align-items: center;
    }

    .detail-navigation {
      flex: 0 0 auto;
      justify-content: flex-end;
      gap: var(--space-2);
      min-height: 2.5rem;
      border-bottom: 1px solid var(--border);
      padding: 0 var(--space-3) 0 var(--space-4);
    }

    .detail-navigation-actions {
      gap: var(--space-1);
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }

    .detail-navigation-position {
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      font-size: 0.7rem;
    }

    .detail-navigation-shortcut {
      gap: var(--space-2);
    }
  }
</style>
