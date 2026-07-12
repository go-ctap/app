<script lang="ts">
  import { ChevronDown, Copy } from "@lucide/svelte";
  import type { InspectInfo } from "../../../../bindings/github.com/go-ctap/kit/model";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  import { m } from "../../../paraglide/messages.js";

  let { info = null, onCopy = () => {} }: { info?: InspectInfo | null; onCopy?: () => void | Promise<void> } = $props();
</script>

<Tooltip.Provider delayDuration={350}>
  <Collapsible.Root class="raw-inspection">
    <div class="raw-inspection-header">
      <Collapsible.Trigger
        class={buttonVariants({ variant: "ghost", size: "sm", class: "raw-inspection-trigger" })}
        aria-label={m.raw_inspection_data()}
      >
        <span class="raw-inspection-heading">
          <span class="raw-inspection-title">{m.raw_inspection_data()}</span>
          <span class="raw-inspection-meta"><code>ctapkit</code> · {m.raw_operation_response()}</span>
        </span>
        <ChevronDown class="raw-inspection-chevron" aria-hidden="true" />
      </Collapsible.Trigger>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label={m.copy_json()}
              onclick={onCopy}
            >
              <Copy data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="top">{m.copy_json()}</Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>

    <Collapsible.Content class="raw-inspection-content">
      <JsonView value={info} variant="code" />
    </Collapsible.Content>
  </Collapsible.Root>
</Tooltip.Provider>

<style>
@layer blocks {
  :global(.raw-inspection) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--card);
  }

  .raw-inspection-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    padding-right: var(--space-3);
  }

  :global(.raw-inspection-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: auto;
    min-width: 0;
    padding: var(--space-3);
    text-align: left;
  }

  .raw-inspection-heading {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .raw-inspection-title,
  .raw-inspection-meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .raw-inspection-meta {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    font-weight: 400;
  }

  :global(.raw-inspection-chevron) {
    transition: transform 120ms ease;
  }

  :global(.raw-inspection-content) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    border-top: 1px solid var(--border);
    padding: var(--space-3);
  }
}

@layer exceptions {
  .raw-inspection-header:hover,
  .raw-inspection-header:focus-within {
    background: var(--muted);
  }

  :global(.raw-inspection[data-state="open"]) .raw-inspection-header {
    background: var(--muted);
  }

  :global(.raw-inspection[data-state="open"] .raw-inspection-chevron) {
    transform: rotate(180deg);
  }
}
</style>
