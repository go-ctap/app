<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewMDSObservation } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let { observations = [] }: { observations?: OverviewMDSObservation[] } = $props();

  function label(severity: OverviewMDSObservation["severity"]) {
    if (severity === "critical") return m.severity_critical();
    if (severity === "warning") return m.severity_warning();
    return m.severity_info();
  }
</script>

{#if observations.length}
  <Collapsible.Root class="workbench-disclosure observations-panel">
    <Collapsible.Trigger>
      <span>{m.mds_observations_title()}</span>
      <Badge variant="outline" class="count">{m.items_count({ count: observations.length })}</Badge>
    </Collapsible.Trigger>
    <Collapsible.Content class="workbench-disclosure__content">
      <p class="workbench-panel__copy">{m.mds_observations_description()}</p>
      <div class="workbench-table-frame">
        <Table.Root class="workbench-table">
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
                <Table.Cell><Badge variant="outline" class="severity" data-severity={observation.severity}>{label(observation.severity)}</Badge></Table.Cell>
                <Table.Cell><strong>{observation.finding}</strong></Table.Cell>
                <Table.Cell><strong>{observation.token || m.not_reported()}</strong></Table.Cell>
                <Table.Cell><strong>{observation.mds || m.not_reported()}</strong></Table.Cell>
                <Table.Cell><code>{observation.source}</code></Table.Cell>
                <Table.Cell>{observation.description}</Table.Cell>
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
    :global(.observations-panel) {
      --table-min-width: 72rem;
    }

    :global(.count),
    :global(.severity) {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    p {
      margin: 0;
    }

    :global(.severity[data-severity="critical"]) {
      border-color: color-mix(in srgb, var(--destructive) 34%, var(--border));
      background: color-mix(in srgb, var(--destructive) 10%, var(--background));
      color: var(--destructive);
    }

    :global(.severity[data-severity="warning"]) {
      background: var(--muted);
      color: var(--chart-3);
    }

    :global(.severity[data-severity="info"]) {
      color: var(--muted-foreground);
    }

    code {
      overflow-wrap: anywhere;
    }
}
</style>
