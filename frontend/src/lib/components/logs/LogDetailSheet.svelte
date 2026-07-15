<script lang="ts">
  import { X } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import type { LogRecord } from "$lib/features/logs/state.svelte.js";
  import { logSummary, logTime } from "$lib/log-presentation.js";

  import { m } from "../../../paraglide/messages.js";
  import LogDetail from "./LogDetail.svelte";
  import LogDetailNavigation from "./LogDetailNavigation.svelte";

  type Props = {
    open: boolean;
    record: LogRecord;
    position: number;
    total: number;
    canPrevious: boolean;
    canNext: boolean;
    onPrevious?: () => void;
    onNext?: () => void;
    onOpenChange?: (open: boolean) => void;
  };

  let {
    open,
    record,
    position,
    total,
    canPrevious,
    canNext,
    onPrevious = () => undefined,
    onNext = () => undefined,
    onOpenChange = () => undefined,
  }: Props = $props();

  let sheetContent: HTMLElement | null = $state(null);

  function handleOpenAutoFocus(event: Event) {
    event.preventDefault();
    requestAnimationFrame(() => sheetContent?.focus({ preventScroll: true }));
  }

  function isEditableTarget(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (
      !open
      || !event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || isEditableTarget(event.target)
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

<Sheet.Root {open} {onOpenChange}>
  <Sheet.Content
    bind:ref={sheetContent}
    side="right"
    class="log-detail-sheet"
    showCloseButton={false}
    onOpenAutoFocus={handleOpenAutoFocus}
  >
    <Sheet.Title class="sr-only">{logSummary(record)}</Sheet.Title>
    <Sheet.Description class="sr-only">{logTime(record)}</Sheet.Description>
    <div class="log-detail-sheet-titlebar">
      <Sheet.Close>
        {#snippet child({ props })}
          <Button
            {...props}
            type="button"
            variant="ghost"
            size="icon-sm"
            class="log-detail-sheet-close"
            aria-label={m.close()}
          >
            <X data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
      </Sheet.Close>
    </div>
    <LogDetailNavigation
      {position}
      {total}
      {canPrevious}
      {canNext}
      {onPrevious}
      {onNext}
    />
    <LogDetail {record} />
  </Sheet.Content>
</Sheet.Root>

<style>
  @layer blocks {
    :global(.log-detail-sheet) {
      width: min(42rem, calc(100vw - 8rem));
      max-width: none;
    }

    .log-detail-sheet-titlebar {
      display: flex;
      align-items: center;
    }

    .log-detail-sheet-titlebar {
      flex: 0 0 var(--shell-titlebar-block-size);
      justify-content: flex-end;
      min-width: 0;
      padding: 0 var(--space-3);
      border-bottom: 1px solid var(--border);
      user-select: none;
      --wails-non-client-region: caption;
      --wails-draggable: drag;
    }

    :global(.log-detail-sheet-close) {
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }
  }
</style>
