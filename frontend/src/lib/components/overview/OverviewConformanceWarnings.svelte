<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewConformanceWarning } from "$lib/overview-rules";
  import { m } from "../../../paraglide/messages.js";

  let { warnings = [] }: { warnings?: OverviewConformanceWarning[] } = $props();
</script>

{#if warnings.length}
  <Card.Root>
    <Card.Header>
      <Card.Title>{m.conformance_warnings()}</Card.Title>
      <Card.Description>{m.conformance_warnings_description()}</Card.Description>
      <Card.Action>
        <Badge variant="destructive">{m.status_warning()}</Badge>
      </Card.Action>
    </Card.Header>

    <Card.Content>
      <div class="table-frame">
        <Table.Root class="warnings-table">
          <Table.Header class="warnings-table-header">
            <Table.Row>
              <Table.Head>{m.finding()}</Table.Head>
              <Table.Head>{m.source()}</Table.Head>
              <Table.Head>{m.description()}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each warnings as warning (`${warning.name}:${warning.source}`)}
              <Table.Row>
                <Table.Cell><strong>{warning.value || m.not_reported()}</strong></Table.Cell>
                <Table.Cell><code>{warning.source}</code></Table.Cell>
                <Table.Cell class="text-cell">{warning.description}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </Card.Content>
  </Card.Root>
{/if}

<style>
@layer blocks {
  .table-frame {
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
  }

  :global(.warnings-table) {
    min-width: 58rem;
  }

  :global(.warnings-table-header tr) {
    background: color-mix(in srgb, var(--muted) 40%, transparent);
  }

  :global(.text-cell) {
    white-space: normal;
  }

  code {
    overflow-wrap: anywhere;
  }
}
</style>
