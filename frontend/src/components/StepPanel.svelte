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

<Card.Root class={`step-panel ${active ? "active" : ""}`}>
  <div class="step-kicker">
    <span>{step}</span>
    <strong>{title}</strong>
  </div>
  {@render children?.()}
</Card.Root>
