<script lang="ts">
  import type { Snippet } from "svelte";
  import { CircleDashed } from "@lucide/svelte";
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

<section class="empty-state" data-variant={variant}>
  <div class="empty-icon" aria-hidden="true">
    {#if icon}
      {@render icon()}
    {:else}
      <CircleDashed size={24} />
    {/if}
  </div>
  {#if eyebrow}
    <p class="eyebrow">{eyebrow}</p>
  {/if}
  <h2>{title}</h2>
  {#if message}
    <p>{message}</p>
  {/if}
  {#if actions}
    <div class="actions cluster">
      {@render actions()}
    </div>
  {/if}
</section>

<style>
  .empty-state {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-2);
    min-height: calc(100vh - 9rem);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--color-panel) 65%, transparent);
    color: var(--color-text-muted);
    padding: var(--space-6);
    text-align: center;
  }

  .empty-state[data-variant="compact"] {
    min-height: 10rem;
    padding: var(--space-4);
  }

  .empty-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
  }

  .eyebrow,
  h2,
  p {
    margin: 0;
  }

  .eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h2 {
    color: var(--color-text);
    font-size: 1rem;
  }

  p {
    max-width: 34rem;
    line-height: 1.55;
  }

  .actions {
    margin-top: var(--space-2);
    --cluster-justify: center;
  }
</style>
