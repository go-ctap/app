<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { m } from "../paraglide/messages.js";

  type Props = {
    title?: string;
    eyebrow?: string;
    wide?: boolean;
    destructive?: boolean;
    closeLabel?: string;
    close?: () => void;
    primary?: () => void;
    children?: Snippet;
    actions?: Snippet;
  };

  let {
    title = "",
    eyebrow = "",
    wide = false,
    destructive = false,
    closeLabel = m.cancel(),
    close = () => {},
    primary = () => {},
    children,
    actions,
  }: Props = $props();

  let dialog: HTMLDivElement | null = $state(null);
  let restoreTo: Element | null = typeof document !== "undefined" ? document.activeElement : null;

  function focusInitialTarget() {
    const focusTarget =
      dialog?.querySelector<HTMLElement>("[data-dialog-initial-focus]") ||
      dialog?.querySelector<HTMLElement>("[data-primary]") ||
      dialog;
    focusTarget?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
      if (target?.tagName !== "TEXTAREA") {
        const primaryButton = dialog?.querySelector<HTMLElement>("[data-primary]");
        if (primaryButton) {
          event.preventDefault();
          primaryButton.click();
        }
      }
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      const primaryButton = dialog?.querySelector<HTMLElement>("[data-primary]");
      if (primaryButton) {
        event.preventDefault();
        primaryButton.click();
      }
    }
  }

  async function handleOpenAutoFocus(event: Event) {
    event.preventDefault();
    await tick();
    focusInitialTarget();
  }

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (restoreTo instanceof HTMLElement) restoreTo.focus();
  }
</script>

<Dialog.Root open={true} onOpenChange={(open) => !open && close()}>
    <Dialog.Content
      class="dialog-shell-content"
      showCloseButton={false}
      bind:ref={dialog}
      data-size={wide ? "wide" : "default"}
      data-tone={destructive ? "destructive" : "neutral"}
      tabindex={-1}
      aria-label={title}
      trapFocus={true}
      onOpenAutoFocus={handleOpenAutoFocus}
      onCloseAutoFocus={handleCloseAutoFocus}
      onkeydown={handleKeydown}
    >
      <header class="dialog-header">
        <div>
          {#if eyebrow}
            <p class="eyebrow">{eyebrow}</p>
          {/if}
          <Dialog.Title>{title}</Dialog.Title>
        </div>
        <Button variant="ghost" size="icon-sm" type="button" aria-label={closeLabel} onclick={close}>
          <X size={16} />
        </Button>
      </header>

      <div class="dialog-body">
        {@render children?.()}
      </div>

      {#if actions}
        {@render actions()}
      {:else}
        <footer class="dialog-actions cluster">
          <Button variant={destructive ? "destructive" : "default"} data-primary type="button" onclick={primary}>Continue</Button>
          <Button variant="outline" type="button" onclick={close}>{closeLabel}</Button>
        </footer>
      {/if}
    </Dialog.Content>
</Dialog.Root>

<style>
@layer blocks {
    :global(.dialog-shell-content) {
      width: min(32rem, 100%);
      max-height: calc(100vh - 2rem);
      overflow: auto;
      padding: var(--space-5);
    }

    :global(.dialog-shell-content[data-size="wide"]) {
      width: min(52rem, 100%);
      max-width: calc(100% - 2rem);
    }

    :global(.dialog-shell-content[data-tone="destructive"]) {
      border-color: color-mix(in srgb, var(--destructive) 34%, var(--border));
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .eyebrow {
      margin: 0;
    }

    .eyebrow {
      color: var(--muted-foreground);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .dialog-body {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .dialog-actions {
      --cluster-justify: flex-end;
    }

}
</style>
