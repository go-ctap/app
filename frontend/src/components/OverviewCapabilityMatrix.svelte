<script module lang="ts">
  import { Award, Boxes, Cpu, Database, FingerprintPattern, IdCard, Info, ListChecks, Puzzle, ShieldCheck, SlidersHorizontal } from "@lucide/svelte";

  const GROUP_ICONS: Record<string, typeof ShieldCheck> = {
    Identity: IdCard,
    Protocol: Cpu,
    Verification: FingerprintPattern,
    Storage: Database,
    Management: ListChecks,
    Policy: SlidersHorizontal,
    Extensions: Puzzle,
    Limits: Boxes,
    Attestation: Award,
  };
</script>

<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Card } from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { overviewStatusLabel, type OverviewGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

  let { groups = [], warningCount = 0 }: { groups?: OverviewGroup[]; warningCount?: number } = $props();
</script>

<Card class="matrix-panel workbench-panel">
  <header class="workbench-panel__header">
    <div>
      <h2>{m.capability_matrix()}</h2>
      <p>{m.capability_matrix_description()}</p>
    </div>
    {#if warningCount}
      <Badge variant="outline" class="count-badge">{m.warnings_count({ count: warningCount })}</Badge>
    {/if}
  </header>

  <div class="workbench-table-frame">
    <Table.Root class="workbench-table">
      <Table.Header>
        <Table.Row>
          <Table.Head>{m.name()}</Table.Head>
          <Table.Head>{m.description()}</Table.Head>
          <Table.Head class="workbench-table__status">{m.status()}</Table.Head>
          <Table.Head>{m.value()}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each groups as group (group.name)}
          {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
          <Table.Row class="group-row">
            <Table.Cell colspan={4}>
              <span>
                <GroupIcon size={15} />
                {group.name}
              </span>
            </Table.Cell>
          </Table.Row>
          {#each group.rows as row (`${row.group}:${row.name}`)}
            <Table.Row data-state={row.status === "unsupported" ? "muted" : undefined}>
              <Table.Cell>
                <strong>{row.name}</strong>
                {#if row.source}
                  <small>{row.source}</small>
                {/if}
              </Table.Cell>
              <Table.Cell>{row.description}</Table.Cell>
              <Table.Cell class="workbench-table__status">
                <StatusBadge
                  value={row.status}
                  label={overviewStatusLabel(row.status)}
                  help={row.source || row.name}
                  tone={row.status === "unsupported" ? "neutral" : "auto"}
                />
              </Table.Cell>
              <Table.Cell><strong>{row.value || m.not_reported()}</strong></Table.Cell>
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={4} class="empty-cell">{m.no_getinfo_fields_reported()}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</Card>

<style>
@layer blocks {
    :global(.matrix-panel) {
      --table-min-width: 58rem;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1rem;
    }

    :global(.count-badge) {
      align-self: start;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--muted);
      color: var(--chart-3);
      padding: 3px 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    :global(.group-row td) {
      background: var(--muted);
      color: var(--foreground);
      font-weight: 700;
    }

    :global(.group-row span) {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    small {
      display: block;
      margin-top: var(--space-1);
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      overflow-wrap: anywhere;
    }

    :global(tr[data-state="muted"]) {
      color: var(--muted-foreground);
    }

    :global(.empty-cell) {
      height: 6rem;
      color: var(--muted-foreground);
      text-align: center;
      vertical-align: middle;
    }
}
</style>
