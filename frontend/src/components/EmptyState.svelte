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

<Empty.Root class={`empty-state ${variant === "compact" ? "compact" : ""} ${variant === "workspace" ? "workspace" : ""}`}>
  <Empty.Media variant="icon" class="empty-state-marker" aria-hidden="true"></Empty.Media>
  <Empty.Header class="empty-state-copy">
    {#if eyebrow}
      <p class="empty-state-eyebrow">{eyebrow}</p>
    {/if}
    <Empty.Title>{title}</Empty.Title>
    {#if message}
      <Empty.Description>{message}</Empty.Description>
    {/if}
  </Empty.Header>
  {#if actions}
    <Empty.Content class="empty-state-actions">
      {@render actions()}
    </Empty.Content>
  {/if}
</Empty.Root>
