<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
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

  function variant(severity: OverviewMDSObservation["severity"]): BadgeVariant {
    if (severity === "critical") return "destructive";
    if (severity === "warning") return "secondary";
    return "outline";
  }
</script>

{#if observations.length}
  <Collapsible.Root class="min-w-0 overflow-hidden border bg-card">
    <Collapsible.Trigger class="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-4 font-bold text-foreground">
      <span>{m.mds_observations_title()}</span>
      <Badge variant="outline">{m.items_count({ count: observations.length })}</Badge>
    </Collapsible.Trigger>
    <Collapsible.Content class="grid gap-3 border-t p-4">
      <p class="description">{m.mds_observations_description()}</p>
      <div class="table-frame">
        <Table.Root class="min-w-[72rem]">
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
                <Table.Cell><code>{observation.source}</code></Table.Cell>
                <Table.Cell class="whitespace-normal">{observation.description}</Table.Cell>
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

  code {
    overflow-wrap: anywhere;
  }
}
</style>
