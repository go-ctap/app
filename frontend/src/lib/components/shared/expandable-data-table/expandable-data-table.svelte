<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLTableAttributes } from "svelte/elements";

  type Props = Omit<HTMLTableAttributes, "children"> & {
    header: Snippet;
    children: Snippet;
  };

  let {
    class: className,
    header,
    children,
    ...restProps
  }: Props = $props();
</script>

<div class="expandable-data-table-frame" data-slot="expandable-data-table-frame">
  <div class="expandable-data-table-scroll" data-slot="expandable-data-table-scroll">
    <table
      class={className}
      data-slot="expandable-data-table"
      {...restProps}
    >
      <thead data-slot="expandable-data-table-header">
        <tr data-slot="expandable-data-table-header-row">
          {@render header()}
        </tr>
      </thead>
      <tbody data-slot="expandable-data-table-body">
        {@render children()}
      </tbody>
    </table>
  </div>
</div>

<style>
@layer blocks {
  .expandable-data-table-frame {
    min-width: 0;
    border: 1px solid var(--border);
  }

  .expandable-data-table-scroll {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    caption-side: bottom;
    font-size: 0.75rem;
  }

  thead :global(tr) {
    border-bottom: 1px solid var(--border);
  }

  tbody :global(tr:last-child) {
    border-bottom: 0;
  }

  .expandable-data-table-scroll :global(th) {
    height: 2.5rem;
    padding: var(--space-2);
    color: var(--foreground);
    font-weight: 500;
    text-align: left;
    vertical-align: middle;
    white-space: nowrap;
  }

  .expandable-data-table-scroll :global(td) {
    padding: var(--space-2);
    vertical-align: middle;
    white-space: nowrap;
  }
}
</style>
