<script module lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
</script>

<script lang="ts">
  import { Card } from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewConformanceWarning } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let { warnings = [] }: { warnings?: OverviewConformanceWarning[] } = $props();
</script>

{#if warnings.length}
  <Card class="workbench-panel" data-tone="danger">
    <header class="workbench-panel__header" data-layout="icon">
      <TriangleAlert size={18} />
      <div>
        <h2>{m.conformance_warnings()}</h2>
        <p>{m.conformance_warnings_description()}</p>
      </div>
    </header>

    <div class="workbench-table-frame" data-tone="danger">
      <Table.Root class="workbench-table">
        <Table.Header>
          <Table.Row>
            <Table.Head>{m.warning()}</Table.Head>
            <Table.Head>{m.finding()}</Table.Head>
            <Table.Head>{m.source()}</Table.Head>
            <Table.Head>{m.description()}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each warnings as warning (`${warning.name}:${warning.source}`)}
            <Table.Row>
              <Table.Cell><strong>{warning.name}</strong></Table.Cell>
              <Table.Cell><strong>{warning.value || m.not_reported()}</strong></Table.Cell>
              <Table.Cell><code>{warning.source}</code></Table.Cell>
              <Table.Cell>{warning.description}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </Card>
{/if}

<style>
@layer blocks {
    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1rem;
    }

    code {
      overflow-wrap: anywhere;
    }
}
</style>
