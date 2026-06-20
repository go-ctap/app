<script lang="ts">
  import { pretty } from "$lib/format";
  import { m } from "../paraglide/messages.js";

  type Props = {
    value: unknown;
    title?: string;
    variant?: "card" | "bare" | "code";
  };

  let { value, title = m.raw_json(), variant = "card" }: Props = $props();
  let source = $derived(pretty(value));

  async function copy() {
    await navigator.clipboard?.writeText(source);
  }
</script>

<section class="json-view" data-variant={variant}>
  {#if variant !== "code"}
    <header class="cluster">
      <h3>{title}</h3>
      <button type="button" onclick={copy}>{m.copy()}</button>
    </header>
  {/if}

  <div class="code-scroll">
    <pre>{source}</pre>
  </div>
</section>

<style>
  .json-view {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .json-view[data-variant="card"] {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
    padding: var(--space-4);
  }

  header {
    --cluster-justify: space-between;
    --cluster-space: var(--space-3);
  }

  h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  .code-scroll {
    max-height: 26rem;
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    background: #f7faf8;
  }

  pre {
    min-width: max-content;
    margin: 0;
    padding: var(--space-3);
    color: var(--color-text);
    font-size: 0.82rem;
    line-height: 1.55;
    white-space: pre;
  }
</style>
