<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";

  type Props = {
    title: string;
    value: unknown;
    open?: boolean;
  };

  let { title, value, open = false }: Props = $props();
</script>

<Collapsible.Root class="lab-raw-disclosure" bind:open>
  <Collapsible.Trigger
    class={buttonVariants({ variant: "ghost", size: "sm", class: "lab-raw-disclosure-trigger" })}
  >
    <span>{title}</span>
    <ChevronDown class="lab-raw-disclosure-chevron" aria-hidden="true" />
  </Collapsible.Trigger>
  <Collapsible.Content class="lab-raw-disclosure-content">
    <JsonView {value} title={title} variant="code" />
  </Collapsible.Content>
</Collapsible.Root>

<style>
@layer blocks {
  :global(.lab-raw-disclosure) {
    min-width: 0;
    border: 1px solid var(--border);
  }

  :global(.lab-raw-disclosure-trigger) {
    display: flex;
    justify-content: space-between;
    width: 100%;
    border-radius: 0;
  }

  :global(.lab-raw-disclosure-content) {
    min-width: 0;
    padding: 0 var(--space-3) var(--space-3);
  }

  :global(.lab-raw-disclosure-chevron) {
    transition: transform 160ms ease;
  }
}

@layer exceptions {
  :global(.lab-raw-disclosure[data-state="open"] .lab-raw-disclosure-chevron) {
    transform: rotate(180deg);
  }
}
</style>
