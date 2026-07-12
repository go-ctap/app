<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewMDSObservation, OverviewMDSObservationSeverity } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";

  let { observations = [] }: { observations?: OverviewMDSObservation[] } = $props();

  function label(severity: OverviewMDSObservationSeverity) {
    if (severity === "critical") return m.severity_critical();
    if (severity === "warning") return m.severity_warning();
    return m.severity_info();
  }

  function variant(severity: OverviewMDSObservationSeverity): BadgeVariant {
    if (severity === "critical") return "destructive";
    if (severity === "warning") return "secondary";
    return "outline";
  }
</script>

{#if observations.length}
  <Collapsible.Root class="mds-observations">
    <Collapsible.Trigger class="mds-observations-trigger">
      <span>{m.mds_observations_title()}</span>
      <Badge variant="outline">{m.items_count({ count: observations.length })}</Badge>
    </Collapsible.Trigger>
    <Collapsible.Content class="mds-observations-content">
      <p class="description">{m.mds_observations_description()}</p>
      <div class="table-frame">
        <Table.Root class="observations-table">
          <Table.Header>
            <Table.Row>
              <Table.Head>{m.severity()}</Table.Head>
              <Table.Head>{m.finding()}</Table.Head>
              <Table.Head>{m.token()}</Table.Head>
              <Table.Head>MDS</Table.Head>
              <Table.Head>{m.source()}</Table.Head>
              <Table.Head>{m.description()}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each observations as observation (`${observation.severity}:${observation.source}:${observation.finding}`)}
              <Table.Row>
                <Table.Cell><Badge variant={variant(observation.severity)}>{label(observation.severity)}</Badge></Table.Cell>
                <Table.Cell><strong>{observation.finding}</strong></Table.Cell>
                <Table.Cell><strong>{observation.token || m.not_reported()}</strong></Table.Cell>
                <Table.Cell><strong>{observation.mds || m.not_reported()}</strong></Table.Cell>
                <Table.Cell class="source-cell"><code>{observation.source}</code></Table.Cell>
                <Table.Cell class="text-cell">{observation.description}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </Collapsible.Content>
  </Collapsible.Root>
{/if}

<style>
@layer blocks {
  :global(.mds-observations) {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--card);
  }

  :global(.mds-observations-trigger) {
    display: flex;
    width: 100%;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    border: 0;
    background: transparent;
    color: var(--foreground);
    padding: var(--space-4);
    font-weight: 700;
  }

  :global(.mds-observations-content) {
    display: grid;
    gap: var(--space-3);
    border-top: 1px solid var(--border);
    padding: var(--space-4);
  }

  :global(.observations-table) {
    min-width: 72rem;
  }

  .description {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .table-frame {
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
  }

  :global(.text-cell) {
    white-space: normal;
  }

  :global(.source-cell) {
    white-space: normal;
  }

  code {
    overflow-wrap: anywhere;
  }
}
</style>
