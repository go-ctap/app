<script lang="ts">
  import type { Snippet } from "svelte";

  import { ScrollArea } from "$lib/components/ui/scroll-area";

  type Props = {
    children: Snippet;
  };

  let { children }: Props = $props();
</script>

<ScrollArea class="modal-scroll-area">
  <div class="modal-scroll-content">
    {@render children()}
  </div>
</ScrollArea>

<style>
  @layer blocks {
    :global(.modal-scroll-area),
    :global(.modal-scroll-area > [data-scroll-area-viewport]) {
      max-height: calc(100dvh - 4rem);
    }

    .modal-scroll-content {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
      padding-inline-end: var(--space-1);
    }
  }
</style>
