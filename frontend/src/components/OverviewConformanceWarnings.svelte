<script module lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
</script>

<script lang="ts">
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewConformanceWarning } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  export let warnings: OverviewConformanceWarning[] = [];
</script>

{#if warnings.length}
  <Alert variant="destructive">
    <TriangleAlert />
    <AlertTitle>{m.conformance_warnings()}</AlertTitle>
    <AlertDescription class="col-start-2 grid gap-3 text-foreground">
      <p class="text-muted-foreground">{m.conformance_warnings_description()}</p>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="min-w-55">{m.warning()}</Table.Head>
            <Table.Head class="min-w-55">{m.finding()}</Table.Head>
            <Table.Head class="min-w-55">{m.source()}</Table.Head>
            <Table.Head class="min-w-70">{m.description()}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each warnings as warning (`${warning.name}:${warning.source}`)}
            <Table.Row>
              <Table.Cell class="whitespace-normal align-top font-medium">{warning.name}</Table.Cell>
              <Table.Cell class="whitespace-normal align-top">
                <span class="wrap-break-word font-medium">{warning.value || m.not_reported()}</span>
              </Table.Cell>
              <Table.Cell class="whitespace-normal align-top text-muted-foreground">
                <span class="break-all">{warning.source}</span>
              </Table.Cell>
              <Table.Cell class="whitespace-normal align-top text-muted-foreground">{warning.description}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </AlertDescription>
  </Alert>
{/if}
