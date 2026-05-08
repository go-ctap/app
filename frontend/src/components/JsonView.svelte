<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { pretty } from "../lib/format";

  type Props = {
    value: unknown;
    title?: string;
    variant?: "card" | "bare";
  };

  let { value, title = "Raw JSON", variant = "card" }: Props = $props();

  async function copy() {
    await navigator.clipboard?.writeText(pretty(value));
  }
</script>

{#if variant === "card"}
  <Card.Root class="json-view">
    <div class="section-heading">
      <h3>{title}</h3>
      <Button variant="outline" size="sm" type="button" onclick={copy}>Copy</Button>
    </div>
    <pre>{pretty(value)}</pre>
  </Card.Root>
{:else}
  <section class="json-view-bare">
    <div class="bare-json-actions">
      <span>{title}</span>
      <Button variant="outline" size="xs" type="button" onclick={copy}>Copy</Button>
    </div>
    <pre>{pretty(value)}</pre>
  </section>
{/if}
