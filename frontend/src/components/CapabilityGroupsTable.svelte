<script lang="ts">
  import type { ColumnDef } from "@tanstack/table-core";
  import { getCoreRowModel, getExpandedRowModel, getGroupedRowModel } from "@tanstack/table-core";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { createSvelteTable } from "$lib/components/ui/data-table/index.js";
  import { m } from "../paraglide/messages.js";

  export type CapabilityGroupRow = {
    group: string;
    label: string;
    value?: string;
    state: "supported" | "unsupported" | "unknown";
    known: boolean;
    supported: boolean;
  };

  type Props = {
    rows: CapabilityGroupRow[];
  };

  let { rows }: Props = $props();

  const columns: ColumnDef<CapabilityGroupRow>[] = [
    {
      accessorKey: "group",
      header: m.group(),
    },
    {
      accessorKey: "label",
      header: m.capability(),
    },
  ];

  const table = createSvelteTable({
    get data() {
      return rows;
    },
    columns,
    state: {
      grouping: ["group"],
      expanded: true,
      columnVisibility: {
        group: false,
      },
    },
    groupedColumnMode: false,
    getRowId: (row) => `${row.group}:${row.label}`,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  function groupName(row: ReturnType<typeof table.getRowModel>["rows"][number]) {
    return String(row.getGroupingValue("group") ?? row.id);
  }

  function groupSummary(row: ReturnType<typeof table.getRowModel>["rows"][number]) {
    const leaves = row.getLeafRows();
    const supported = leaves.filter((item) => item.original.supported).length;
    return m.supported_ratio({ supported, total: leaves.length });
  }

  function statusMark(state: CapabilityGroupRow["state"]) {
    if (state === "supported") return "✓";
    if (state === "unknown") return "?";
    return "-";
  }

  function statusClass(state: CapabilityGroupRow["state"]) {
    if (state === "supported") return "border-primary bg-primary text-primary-foreground";
    if (state === "unknown") return "border-muted-foreground/40 text-muted-foreground";
    return "border-border text-muted-foreground";
  }

  function rowClass(state: CapabilityGroupRow["state"]) {
    return state === "unsupported" ? "text-muted-foreground" : "";
  }
</script>

<div class="overflow-x-auto rounded-md border">
  <Table.Root>
    <Table.Body>
      {#each table.getRowModel().rows as row (row.id)}
        {#if row.getIsGrouped()}
          <Table.Row class="bg-muted/50 hover:bg-muted/50">
            <Table.Cell class="py-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-medium">{groupName(row)}</span>
                <Badge variant="secondary">{groupSummary(row)}</Badge>
              </div>
            </Table.Cell>
          </Table.Row>
        {:else}
          {@const item = row.original}
          <Table.Row class={rowClass(item.state)}>
            <Table.Cell>
              <div class="flex min-w-[260px] items-start gap-3">
                <span class={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${statusClass(item.state)}`}>
                  {statusMark(item.state)}
                </span>
                <span class="whitespace-normal break-words">
                  <span class="font-medium">{item.label}</span>
                  {#if item.value}
                    <span class="text-muted-foreground">: {item.value}</span>
                  {:else if item.state === "unknown"}
                    <span class="text-muted-foreground"> {m.not_reported()}</span>
                  {:else if item.state === "unsupported"}
                    <span class="text-muted-foreground"> {m.state_not_available()}</span>
                  {/if}
                </span>
              </div>
            </Table.Cell>
          </Table.Row>
        {/if}
      {:else}
        <Table.Row>
          <Table.Cell class="h-24 text-center">
            {m.no_capabilities_reported()}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
