<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { Dialog } from "bits-ui";
  import { X } from "@lucide/svelte";
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
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content
      bind:ref={dialog}
      data-size={wide ? "wide" : "default"}
      data-tone={destructive ? "destructive" : "neutral"}
      tabindex="-1"
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
          <Dialog.Title level={2}>{title}</Dialog.Title>
        </div>
        <Dialog.Close type="button" aria-label={closeLabel}>
          <X size={16} />
        </Dialog.Close>
      </header>

      <div class="dialog-body">
        {@render children?.()}
      </div>

      {#if actions}
        {@render actions()}
      {:else}
        <footer class="dialog-actions cluster">
          <button class="primary" data-tone={destructive ? "destructive" : "neutral"} data-primary type="button" onclick={primary}>Continue</button>
          <button type="button" onclick={close}>{closeLabel}</button>
        </footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .dialog-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .eyebrow {
    margin: 0;
  }

  .eyebrow {
    color: var(--color-text-muted);
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

  .primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: white;
  }

  .primary:hover:not(:disabled) {
    border-color: var(--color-accent-hover);
    background: var(--color-accent-hover);
  }

  .primary[data-tone="destructive"] {
    border-color: var(--color-danger);
    background: var(--color-danger);
  }

</style>
