<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewMDSObservation } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  export let observations: OverviewMDSObservation[] = [];

  function label(severity: OverviewMDSObservation["severity"]) {
    if (severity === "critical") return m.severity_critical();
    if (severity === "warning") return m.severity_warning();
    return m.severity_info();
  }

  function badgeClass(severity: OverviewMDSObservation["severity"]) {
    if (severity === "critical") return "";
    if (severity === "warning") return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
</script>

{#if observations.length}
  <details class="min-w-0 max-w-full overflow-hidden rounded-xl border bg-card text-sm shadow-xs ring-1 ring-foreground/10">
    <summary class="cursor-pointer px-6 py-4 font-medium">
      <span class="inline-flex flex-wrap items-center gap-2">
        <span>{m.mds_observations_title()}</span>
        <Badge variant="secondary">{m.items_count({ count: observations.length })}</Badge>
      </span>
    </summary>
    <div class="grid min-w-0 gap-3 border-t px-6 pt-4 pb-6">
      <p class="text-sm text-muted-foreground">{m.mds_observations_description()}</p>
      <ScrollArea orientation="horizontal" class="max-w-full rounded-md border" scrollbarXClasses="z-20">
        <Table.Root class="min-w-[72rem]">
          <Table.Header>
            <Table.Row>
              <Table.Head class="min-w-30">{m.severity()}</Table.Head>
              <Table.Head class="min-w-55">{m.finding()}</Table.Head>
              <Table.Head class="min-w-45">{m.token()}</Table.Head>
              <Table.Head class="min-w-45">MDS</Table.Head>
              <Table.Head class="min-w-55">{m.source()}</Table.Head>
              <Table.Head class="min-w-70">{m.description()}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each observations as observation (`${observation.severity}:${observation.source}:${observation.finding}`)}
              <Table.Row>
                <Table.Cell class="whitespace-normal align-top">
                  <Badge variant={observation.severity === "critical" ? "destructive" : "outline"} class={badgeClass(observation.severity)}>
                    {label(observation.severity)}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top font-medium">{observation.finding}</Table.Cell>
                <Table.Cell class="whitespace-normal align-top">
                  <span class="wrap-break-word font-medium">{observation.token || m.not_reported()}</span>
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top">
                  <span class="wrap-break-word font-medium">{observation.mds || m.not_reported()}</span>
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top text-muted-foreground">
                  <span class="break-all">{observation.source}</span>
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top text-muted-foreground">{observation.description}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </div>
  </details>
{/if}
