<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";
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
  let restoreTo: Element | null = null;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
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

  onMount(async () => {
    restoreTo = document.activeElement;
    await tick();
    const focusTarget = dialog?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]:not([tabindex='-1'])");
    focusTarget?.focus();
    return () => {
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  });
</script>

<div class="dialog-backdrop" role="presentation">
  <div
    bind:this={dialog}
    class="dialog-panel"
    data-size={wide ? "wide" : "default"}
    data-tone={destructive ? "destructive" : "neutral"}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={title}
    onkeydown={handleKeydown}
  >
    <header class="dialog-header">
      <div>
        {#if eyebrow}
          <p class="eyebrow">{eyebrow}</p>
        {/if}
        <h2>{title}</h2>
      </div>
      <button class="icon-close" type="button" onclick={close} aria-label={closeLabel}>
        <X size={16} />
      </button>
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
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    background: rgb(16 22 20 / 0.36);
    padding: var(--space-4);
  }

  .dialog-panel {
    display: grid;
    gap: var(--space-4);
    width: min(32rem, 100%);
    max-height: calc(100vh - 2rem);
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
    box-shadow: var(--shadow-panel);
    padding: var(--space-5);
  }

  .dialog-panel[data-size="wide"] {
    width: min(52rem, 100%);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
  }

  h2,
  .eyebrow {
    margin: 0;
  }

  h2 {
    font-size: 1.05rem;
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

  .icon-close {
    width: 32px;
    height: 32px;
    padding: 0;
  }
</style>
