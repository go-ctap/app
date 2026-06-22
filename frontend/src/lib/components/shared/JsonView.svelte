<script lang="ts">
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
  let source = $derived(sanitizedJson(value));

  async function copy() {
    await navigator.clipboard?.writeText(source);
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
      <div class="json-frame">
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
  <div class="json-frame">
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
    max-height: 26rem;
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
    background: var(--muted);
  }

  .json-frame pre {
    min-width: max-content;
    margin: 0;
    padding: var(--space-3);
    color: var(--foreground);
    font-size: 0.82rem;
    line-height: 1.55;
    white-space: pre;
  }
}
</style>
