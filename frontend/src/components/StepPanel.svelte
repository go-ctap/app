<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Card from "$lib/components/ui/card/index.js";

  type Props = {
    step?: string;
    title?: string;
    active?: boolean;
    children?: Snippet;
  };

  let { step = "1", title = "", active = false, children }: Props = $props();
</script>

<Card.Root class={active ? "ring-2 ring-ring/35" : ""}>
  <Card.Content class="grid gap-4 pt-4">
  <div class="flex items-center gap-2">
    <span class="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{step}</span>
    <strong>{title}</strong>
  </div>
  {@render children?.()}
  </Card.Content>
</Card.Root>
