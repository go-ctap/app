<script lang="ts">
  import { copyToClipboard } from "$lib/clipboard";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { sanitizedJson } from "$lib/redaction";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    value: unknown;
    title?: string;
    variant?: "card" | "bare" | "code";
  };

  let { value, title = m.raw_json(), variant = "card" }: Props = $props();
  let source = $derived(sanitizedJson(value) ?? "null");

  async function copy() {
    await copyToClipboard(source, m.json_copied());
  }
</script>

{#if variant === "card"}
  <Card.Root>
    <Card.Header>
      <Card.Title>{title}</Card.Title>
      <Card.Action>
        <Button variant="outline" type="button" onclick={copy}>{m.copy()}</Button>
      </Card.Action>
    </Card.Header>
    <Card.Content>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code region) -->
      <div class="json-frame" role="region" aria-label={title} tabindex="0">
        <pre>{source}</pre>
      </div>
    </Card.Content>
  </Card.Root>
{:else}
  {#if variant === "bare"}
    <div class="json-toolbar">
      <h3>{title}</h3>
      <Button variant="outline" type="button" onclick={copy}>{m.copy()}</Button>
    </div>
  {/if}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code region) -->
  <div class="json-frame" role="region" aria-label={title} tabindex="0">
    <pre>{source}</pre>
  </div>
{/if}

<style>
@layer blocks {
  .json-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  .json-frame {
    inline-size: 100%;
    max-inline-size: 100%;
    max-block-size: var(--json-view-max-block-size, min(26rem, 44dvh));
    min-inline-size: 0;
    overflow-x: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    border: 1px solid var(--border);
    background: var(--muted);
  }

  .json-frame pre {
    inline-size: max-content;
    min-inline-size: 100%;
    margin: 0;
    padding: var(--space-3);
    color: var(--foreground);
    font-size: 0.82rem;
    line-height: 1.55;
    white-space: pre;
  }
}
</style>
