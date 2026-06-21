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
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { overviewStatusLabel, type OverviewGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

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
      <Table.Root class="min-w-[58rem]">
        <Table.Header>
          <Table.Row>
            <Table.Head>{m.name()}</Table.Head>
            <Table.Head>{m.description()}</Table.Head>
            <Table.Head class="text-right">{m.status()}</Table.Head>
            <Table.Head>{m.value()}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each groups as group (group.name)}
            {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
            <Table.Row>
              <Table.Cell colspan={4}>
                <span class="group-label">
                  <GroupIcon size={15} />
                  {group.name}
                </span>
              </Table.Cell>
            </Table.Row>
            {#each group.rows as row (`${row.group}:${row.name}`)}
              <Table.Row class="data-[state=muted]:text-muted-foreground" data-state={row.status === "unsupported" ? "muted" : undefined}>
                <Table.Cell>
                  <strong>{row.name}</strong>
                  {#if row.source}
                    <small>{row.source}</small>
                  {/if}
                </Table.Cell>
                <Table.Cell class="whitespace-normal">{row.description}</Table.Cell>
                <Table.Cell class="text-right">
                  <StatusBadge
                    value={row.status}
                    label={overviewStatusLabel(row.status)}
                    help={row.source || row.name}
                    tone={row.status === "unsupported" ? "neutral" : "auto"}
                  />
                </Table.Cell>
                <Table.Cell class="whitespace-normal"><strong>{row.value || m.not_reported()}</strong></Table.Cell>
              </Table.Row>
            {/each}
          {:else}
            <Table.Row>
              <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">{m.no_getinfo_fields_reported()}</Table.Cell>
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
