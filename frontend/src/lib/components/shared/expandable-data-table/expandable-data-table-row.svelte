<script module lang="ts">
  import type { MouseEventHandler } from "svelte/elements";

  export type ExpandableDataTableTriggerProps = {
    "aria-expanded": boolean;
    "aria-controls": string;
    disabled: boolean;
    onclick: MouseEventHandler<HTMLElement>;
    "data-state": "open" | "closed";
    "data-disabled": "true" | undefined;
  };
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    detailsId: string;
    open: boolean;
    disabled: boolean;
    columnCount: number;
    onOpenChange: (open: boolean) => unknown;
    summary: Snippet<[ExpandableDataTableTriggerProps]>;
    details: Snippet;
  };

  let { detailsId, open, disabled, columnCount, onOpenChange, summary, details }: Props = $props();

  let triggerProps = $derived<ExpandableDataTableTriggerProps>({
    "aria-expanded": open,
    "aria-controls": detailsId,
    disabled,
    onclick: () => {
      if (!disabled) onOpenChange(!open);
    },
    "data-state": open ? "open" : "closed",
    "data-disabled": disabled ? "true" : undefined,
  });
</script>

<tr
  class="expandable-data-table-summary-row"
  data-slot="expandable-data-table-summary-row"
  aria-selected={open}
  data-selected={open ? "true" : undefined}
  data-open={open ? "true" : undefined}
  data-disabled={disabled ? "true" : undefined}
>
  {@render summary(triggerProps)}
</tr>
{#if open}
  <tr
    id={detailsId}
    class="expandable-data-table-details-row"
    data-slot="expandable-data-table-details-row"
    data-open="true"
  >
    <td
      class="expandable-data-table-details-cell"
      data-slot="expandable-data-table-details-cell"
      colspan={columnCount}
    >
      {@render details()}
    </td>
  </tr>
{/if}

<style>
  @layer blocks {
    .expandable-data-table-summary-row,
    .expandable-data-table-details-row {
      border-bottom: 1px solid var(--data-table-row-border);
    }

    .expandable-data-table-summary-row {
      transition:
        background-color 120ms ease,
        color 120ms ease;
    }

    .expandable-data-table-summary-row:hover {
      background: var(--data-table-hover-surface);
    }

    .expandable-data-table-details-cell {
      min-width: 0;
      overflow: hidden;
      padding: 0;
      white-space: normal;
    }
  }

  @layer exceptions {
    .expandable-data-table-summary-row[data-selected="true"],
    .expandable-data-table-details-row[data-open="true"] {
      box-shadow: inset 2px 0 var(--primary);
    }

    .expandable-data-table-summary-row[data-selected="true"] {
      background: var(--data-table-selected-surface);
    }

    .expandable-data-table-details-row[data-open="true"] {
      background: var(--data-table-details-surface);
    }
  }
</style>
