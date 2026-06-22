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
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { overviewStatusLabel, type OverviewGroup } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";

  let { groups = [], warningCount = 0 }: { groups?: OverviewGroup[]; warningCount?: number } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{m.capability_matrix()}</Card.Title>
    <Card.Description>{m.capability_matrix_description()}</Card.Description>
    {#if warningCount}
      <Card.Action>
        <Badge variant="outline">{m.warnings_count({ count: warningCount })}</Badge>
      </Card.Action>
    {/if}
  </Card.Header>

  <Card.Content>
    <div class="table-frame">
      <Table.Root class="capability-table">
        <Table.Header class="capability-table-header">
          <Table.Row>
            <Table.Head>{m.name()}</Table.Head>
            <Table.Head>{m.description()}</Table.Head>
            <Table.Head class="status-column">{m.status()}</Table.Head>
            <Table.Head>{m.value()}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each groups as group (group.name)}
            {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
            <Table.Row class="capability-group-row">
              <Table.Cell colspan={4}>
                <span class="group-label">
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
                <Table.Cell class="text-cell">{row.description}</Table.Cell>
                <Table.Cell class="status-column">
                  <StatusBadge
                    value={row.status}
                    label={overviewStatusLabel(row.status)}
                    help={row.source || row.name}
                    tone={row.status === "unsupported" ? "neutral" : "auto"}
                  />
                </Table.Cell>
                <Table.Cell class="text-cell"><strong>{row.value || m.not_reported()}</strong></Table.Cell>
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
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  .table-frame {
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
  }

  :global(.capability-table) {
    min-width: 58rem;
  }

  :global(.capability-table-header tr),
  :global(.capability-group-row) {
    background: color-mix(in srgb, var(--muted) 40%, transparent);
  }

  :global(.capability-group-row:hover) {
    background: color-mix(in srgb, var(--muted) 40%, transparent);
  }

  :global(.capability-table [data-state="muted"]) {
    color: var(--muted-foreground);
  }

  :global(.status-column) {
    text-align: right;
  }

  :global(.text-cell) {
    white-space: normal;
  }

  :global(.empty-cell) {
    height: 6rem;
    color: var(--muted-foreground);
    text-align: center;
  }

  .group-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 700;
  }

  small {
    display: block;
    margin-top: var(--space-1);
    color: var(--muted-foreground);
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
  }
}
</style>
