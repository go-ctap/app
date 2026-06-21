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
  <div class="empty-state__icon" aria-hidden="true">
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
@layer blocks {
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
}
</style>
