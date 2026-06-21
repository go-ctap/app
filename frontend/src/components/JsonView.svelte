<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Card } from "$lib/components/ui/card/index.js";
  import { sanitizedJson } from "$lib/redaction";
  import { m } from "../paraglide/messages.js";

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

<Card class="json-view workbench-panel" data-variant={variant} data-padding={variant === "card" ? "default" : "none"}>
  {#if variant !== "code"}
    <header class="cluster">
      <h3>{title}</h3>
      <Button variant="outline" type="button" onclick={copy}>{m.copy()}</Button>
    </header>
  {/if}

  <div class="workbench-code-frame">
    <pre>{source}</pre>
  </div>
</Card>

<style>
@layer blocks {
    header {
      --cluster-justify: space-between;
      --cluster-space: var(--space-3);
    }

    h3 {
      margin: 0;
      font-size: 0.95rem;
    }
}
</style>
