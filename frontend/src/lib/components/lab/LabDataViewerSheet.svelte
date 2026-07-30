<script lang="ts">
  import * as Sheet from "$lib/components/ui/sheet";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import JsonView from "$lib/components/shared/JsonView.svelte";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    open?: boolean;
    title: string;
    kind: "json" | "hex";
    value: unknown;
    byteCount?: number;
    onOpenChange?: (open: boolean) => void;
  };

  let {
    open = false,
    title,
    kind,
    value,
    byteCount = 0,
    onOpenChange = () => undefined,
  }: Props = $props();
</script>

<Sheet.Root {open} {onOpenChange}>
  <Sheet.Content side="right" class="lab-data-sheet">
    <Sheet.Header>
      <Sheet.Title>{title}</Sheet.Title>
      <Sheet.Description>
        {kind === "json"
          ? m.lab_json()
          : m.lab_type_and_size({ type: m.lab_hex(), count: byteCount })}
      </Sheet.Description>
    </Sheet.Header>

    <ScrollArea class="lab-data-scroll" orientation="both">
      {#if kind === "json"}
        <JsonView {value} {title} />
      {:else}
        <pre class="lab-full-hex">{String(value)}</pre>
      {/if}
    </ScrollArea>
  </Sheet.Content>
</Sheet.Root>

<style>
  @layer blocks {
    :global(.lab-data-sheet) {
      width: min(52rem, 92vw);
      max-width: none;
      padding: var(--space-4);
    }

    :global(.lab-data-scroll) {
      min-height: 0;
      flex: 1;
    }

    :global(.lab-data-scroll [data-slot="scroll-area-viewport"] > div) {
      min-width: 100%;
    }

    .lab-full-hex {
      width: max-content;
      min-width: 100%;
      margin: 0;
      padding: var(--space-3);
      background: var(--muted);
      font-size: 0.78rem;
      line-height: 1.55;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  }
</style>
