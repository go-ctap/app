<script lang="ts">
  import type { KitLogRecord } from "$lib/features/logs/state.svelte.js";

  import LogRecordRow from "./LogRecordRow.svelte";

  type Props = {
    record: KitLogRecord;
    selected: boolean;
    last: boolean;
    onSelect: (id: string) => void;
    onOpen?: (id: string) => void;
  };

  let { record, selected, last, onSelect, onOpen = onSelect }: Props = $props();
</script>

<div
  class="log-operation-child"
  data-log-operation-child
  data-tree-end={last ? "true" : undefined}
>
  <LogRecordRow
    {record}
    nested
    {selected}
    {onSelect}
    {onOpen}
  />
  <span class="log-operation-tree-segment" aria-hidden="true"></span>
  <span class="log-operation-tree-node" aria-hidden="true"></span>
</div>

<style>
  @layer blocks {
    .log-operation-child {
      --log-tree-center: calc(var(--space-2) + 0.75rem);
      --log-tree-junction-y: calc(var(--space-2) + 0.5rem);
      --log-timeline-color: color-mix(in srgb, var(--muted-foreground) 68%, var(--border));
      position: relative;
      display: grid;
      min-width: 0;
      background: color-mix(in srgb, var(--muted) 55%, var(--background));
    }

    .log-operation-tree-segment,
    .log-operation-tree-node {
      position: absolute;
      display: block;
      pointer-events: none;
    }

    .log-operation-tree-segment {
      top: 0;
      bottom: 0;
      left: calc(var(--log-tree-center) - 0.5px);
      width: 1px;
      background: var(--log-timeline-color);
    }

    .log-operation-tree-node {
      top: calc(var(--log-tree-junction-y) - 2px);
      left: calc(var(--log-tree-center) - 2px);
      width: 4px;
      height: 4px;
      background: var(--muted-foreground);
    }
  }

  @layer exceptions {
    .log-operation-child[data-tree-end="true"] {
      border-bottom: 1px solid var(--border);
    }

    .log-operation-child[data-tree-end="true"] .log-operation-tree-segment {
      bottom: auto;
      height: var(--log-tree-junction-y);
    }
  }
</style>
