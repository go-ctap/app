<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import CopyIcon from "@lucide/svelte/icons/copy";

  import { copyToClipboard } from "$lib/clipboard";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { sanitizedJson } from "$lib/redaction";

  import { m } from "../../../paraglide/messages.js";
  import JsonView from "./JsonView.svelte";

  type Props = {
    value: unknown;
    title?: string;
    description?: string;
    open?: boolean;
  };

  let {
    value,
    title = m.raw_json(),
    description,
    open = $bindable(false),
  }: Props = $props();

  let source = $derived(sanitizedJson(value) ?? "null");

  async function copy() {
    await copyToClipboard(source, m.json_copied());
  }
</script>

<Tooltip.Provider delayDuration={350}>
  <Collapsible.Root class="json-disclosure" bind:open>
    <div class="json-disclosure-header">
      <Collapsible.Trigger
        class={buttonVariants({ variant: "ghost", size: "sm", class: "json-disclosure-trigger" })}
        aria-label={title}
      >
        <span class="json-disclosure-heading">
          <span class="json-disclosure-title">{title}</span>
          {#if description}
            <span class="json-disclosure-description">{description}</span>
          {/if}
        </span>
        <ChevronDownIcon class="json-disclosure-chevron" data-icon="inline-end" aria-hidden="true" />
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
              onclick={copy}
            >
              <CopyIcon data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="top">{m.copy_json()}</Tooltip.Content>
      </Tooltip.Root>
    </div>

    <Collapsible.Content class="json-disclosure-content">
      <JsonView {value} {title} variant="code" />
    </Collapsible.Content>
  </Collapsible.Root>
</Tooltip.Provider>

<style>
@layer blocks {
  :global(.json-disclosure) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--card);
  }

  .json-disclosure-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    padding-right: var(--space-3);
  }

  :global(.json-disclosure-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: auto;
    min-width: 0;
    padding: var(--space-3);
    text-align: left;
  }

  .json-disclosure-heading {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .json-disclosure-title,
  .json-disclosure-description {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .json-disclosure-description {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    font-weight: 400;
  }

  :global(.json-disclosure-chevron) {
    transition: transform 120ms ease;
  }

  :global(.json-disclosure-content) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    border-top: 1px solid var(--border);
    padding: var(--space-3);
  }
}

@layer exceptions {
  .json-disclosure-header:hover,
  .json-disclosure-header:focus-within,
  :global(.json-disclosure[data-state="open"]) .json-disclosure-header {
    background: var(--muted);
  }

  :global(.json-disclosure[data-state="open"] .json-disclosure-chevron) {
    transform: rotate(180deg);
  }
}
</style>
