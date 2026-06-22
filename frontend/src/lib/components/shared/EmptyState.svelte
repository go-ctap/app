<script lang="ts">
  import { CircleDashed } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  import * as Empty from "$lib/components/ui/empty/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    title?: string;
    message?: string;
    eyebrow?: string;
    variant?: "default" | "compact" | "workspace";
    icon?: Snippet;
    actions?: Snippet;
  };

  let {
    title = m.nothing_here_yet(),
    message = "",
    eyebrow = "",
    variant = "default",
    icon,
    actions,
  }: Props = $props();
</script>

<Empty.Root class="empty-state" data-variant={variant}>
  <Empty.Header>
    <Empty.Media variant="icon" aria-hidden="true">
      {#if icon}
        {@render icon()}
      {:else}
        <CircleDashed />
      {/if}
    </Empty.Media>
    {#if eyebrow}
      <p class="empty-eyebrow">{eyebrow}</p>
    {/if}
    <Empty.Title>{title}</Empty.Title>
    {#if message}
      <Empty.Description>{message}</Empty.Description>
    {/if}
  </Empty.Header>
  {#if actions}
    <Empty.Content>
      <div class="empty-actions">
        {@render actions()}
      </div>
    </Empty.Content>
  {/if}
</Empty.Root>

<style>
@layer blocks {
  .empty-eyebrow {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  :global(.empty-state) {
    min-height: max(100%, calc(100vh - 9rem));
    border: 1px dashed color-mix(in srgb, var(--muted-foreground) 42%, var(--border));
    background:
      linear-gradient(var(--card), var(--card)) padding-box,
      color-mix(in srgb, var(--muted) 22%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--background) 75%, transparent);
    text-align: center;
  }

  :global(.empty-state [data-slot="empty-icon"]) {
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--muted) 55%, transparent);
  }

  :global(.empty-state [data-slot="empty-header"]) {
    width: min(100%, 34rem);
    max-width: none;
  }

  :global(.empty-state [data-slot="empty-title"]),
  :global(.empty-state [data-slot="empty-description"]) {
    width: 100%;
  }

  :global(.empty-state [data-slot="empty-description"]) {
    max-width: 30rem;
  }

  :global(.empty-state[data-variant="compact"]) {
    min-height: 10rem;
  }
}
</style>
