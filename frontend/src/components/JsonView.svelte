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
  <Card.Root>
    <Card.Content class="grid gap-3 pt-4">
    <div class="flex items-center justify-between gap-3">
      <h3>{title}</h3>
      <Button variant="outline" size="sm" type="button" onclick={copy}>Copy</Button>
    </div>
    <pre class="m-0 max-h-[420px] overflow-auto rounded-md bg-foreground p-3 text-sm text-background whitespace-pre-wrap">{pretty(value)}</pre>
    </Card.Content>
  </Card.Root>
{:else}
  <section class="grid gap-2">
    <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{title}</span>
      <Button variant="outline" size="xs" type="button" onclick={copy}>Copy</Button>
    </div>
    <pre class="m-0 max-h-[420px] overflow-auto rounded-md bg-foreground p-3 text-sm text-background whitespace-pre-wrap">{pretty(value)}</pre>
  </section>
{/if}
