<script lang="ts">
  import type { Snippet } from "svelte";
  import { CircleDashed } from "@lucide/svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { cn } from "$lib/utils.js";
  import { m } from "../paraglide/messages.js";

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

<Card.Root class={cn("grid place-items-center content-center border-dashed text-center", variant === "compact" ? "min-h-40" : "min-h-[calc(100vh-9rem)]")}>
  <Card.Header class="justify-items-center">
    <div class="empty-icon" aria-hidden="true">
      {#if icon}
        {@render icon()}
      {:else}
        <CircleDashed size={24} />
      {/if}
    </div>
    {#if eyebrow}
      <p class="empty-eyebrow">{eyebrow}</p>
    {/if}
    <Card.Title>{title}</Card.Title>
    {#if message}
      <Card.Description>{message}</Card.Description>
    {/if}
  </Card.Header>
  {#if actions}
    <Card.Content>
      <div class="empty-actions">
        {@render actions()}
      </div>
    </Card.Content>
  {/if}
</Card.Root>

<style>
@layer blocks {
  .empty-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    margin-bottom: var(--space-2);
  }

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
}
</style>
