<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Empty from "$lib/components/ui/empty/index.js";

  type Props = {
    title?: string;
    message?: string;
    eyebrow?: string;
    variant?: "default" | "compact" | "workspace";
    actions?: Snippet;
  };

  let {
    title = "Nothing here yet",
    message = "",
    eyebrow = "",
    variant = "default",
    actions,
  }: Props = $props();
</script>

<Empty.Root class={`mt-4 grid ${variant === "compact" ? "min-h-28 grid-cols-[auto_minmax(0,1fr)] bg-muted/45 p-4" : variant === "workspace" ? "min-h-40" : "min-h-36"} items-center gap-4 rounded-lg border bg-card p-5 text-card-foreground shadow-xs max-sm:grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]`}>
  <Empty.Media variant="icon" class="border" aria-hidden="true"></Empty.Media>
  <Empty.Header class="min-w-0">
    {#if eyebrow}
      <p class="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
    {/if}
    <Empty.Title>{title}</Empty.Title>
    {#if message}
      <Empty.Description>{message}</Empty.Description>
    {/if}
  </Empty.Header>
  {#if actions}
    <Empty.Content class="flex flex-wrap justify-end gap-2 max-sm:justify-start">
      {@render actions()}
    </Empty.Content>
  {/if}
</Empty.Root>
