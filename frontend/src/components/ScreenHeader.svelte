<script lang="ts">
  import type { Snippet } from "svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: Snippet;
  }

  let { eyebrow, title, description, actions }: Props = $props();
</script>

<section class="flex flex-col gap-4 py-5">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="grid max-w-3xl gap-1.5">
      {#if eyebrow}
        <p class="text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
      {/if}
      <h1 class="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
      {#if description}
        <p class="text-sm leading-6 text-muted-foreground">{description}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex flex-wrap items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>
  <Separator />
</section>
