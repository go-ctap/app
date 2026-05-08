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

<Empty.Root class={`mt-4 border ${variant === "compact" ? "min-h-28 p-6" : variant === "workspace" ? "min-h-40" : "min-h-36"}`}>
  <Empty.Media variant="icon" aria-hidden="true"></Empty.Media>
  <Empty.Header>
    {#if eyebrow}
      <p class="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
    {/if}
    <Empty.Title>{title}</Empty.Title>
    {#if message}
      <Empty.Description>{message}</Empty.Description>
    {/if}
  </Empty.Header>
  {#if actions}
    <Empty.Content class="flex flex-wrap justify-center gap-2">
      {@render actions()}
    </Empty.Content>
  {/if}
</Empty.Root>
