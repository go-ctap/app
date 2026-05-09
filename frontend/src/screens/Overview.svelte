<script lang="ts">
  import { operationFailed } from "$lib/api";
  import { loadOverview } from "$lib/controller";
  import { overviewBioSensorEnvelope, overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { resultOf, sessionStateLabel } from "$lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    buildOverviewRows,
    buildOverviewSummaryCards,
    groupOverviewRows,
    overviewStatusLabel,
  } from "$lib/overview-rules";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let selector = $derived($selectedSelector);
  let envelope = $derived($overviewEnvelope);
  let bioSensorEnvelope = $derived($overviewBioSensorEnvelope);
  let loading = $derived($overviewLoading);
  let report = $derived(resultOf(envelope));
  let bioSensorReport = $derived(resultOf(bioSensorEnvelope));
  let device = $derived(report?.device || $selectedDevice || {});
  let info = $derived(report?.info || {});
  let productName = $derived([device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator");
  let summaryCards = $derived(buildOverviewSummaryCards({ info }));
  let overviewRows = $derived(buildOverviewRows({ info, device, bioSensor: bioSensorReport || {} }));
  let overviewGroups = $derived(groupOverviewRows(overviewRows));
  let warningOverviewRows = $derived(overviewRows.filter((row) => row.status === "warning"));

  async function copyReport() {
    await navigator.clipboard?.writeText(JSON.stringify(report ?? null, null, 2));
  }
</script>

{#if !selector}
  <EmptyState title="Choose an authenticator" message="Connect a token and select it in the top bar." />
{:else if report}
  <section class="grid gap-4">
    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div class="grid gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Overview</Badge>
            <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
          </div>
          <Card.Title class="text-2xl">{productName}</Card.Title>
          <Card.Description class="break-all">{device.deviceId || "Current authenticator overview"}</Card.Description>
        </div>
        <Card.Action>
          <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading" : "Reload overview"}</Button>
        </Card.Action>
      </Card.Header>
    </Card.Root>

    {#if operationFailed(envelope)}
      <Alert variant="destructive">
        <AlertDescription>{operationFailed(envelope)}</AlertDescription>
      </Alert>
    {/if}

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {#each summaryCards as card (card.title)}
        <Card.Root>
          <Card.Header class="gap-3">
            <div class="flex items-start justify-between gap-2">
              <div class="grid gap-1">
                <Card.Title class="text-base">{card.title}</Card.Title>
                <Card.Description>{card.description}</Card.Description>
              </div>
              <StatusBadge value={card.status} label={card.statusLabel} help={card.title} />
            </div>
          </Card.Header>
          <Card.Content class="grid gap-2 text-sm">
            {#each card.facts as fact (fact.label)}
              <div class="flex items-start justify-between gap-3" class:text-muted-foreground={fact.status === "unsupported" || fact.status === "unknown"}>
                <span>{fact.label}</span>
                <span class="max-w-[55%] text-right font-medium break-words">{fact.value}</span>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div class="grid gap-1">
          <Card.Title>Capability Matrix</Card.Title>
          <Card.Description>CTAP 2.3 getInfo capabilities, limits, extensions, and certification hints.</Card.Description>
        </div>
        <Card.Action>
          {#if warningOverviewRows.length}
            <Badge variant="secondary">{warningOverviewRows.length} warning{warningOverviewRows.length === 1 ? "" : "s"}</Badge>
          {/if}
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <div class="rounded-md border">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="min-w-[180px]">Name</Table.Head>
                <Table.Head class="min-w-[260px]">Description</Table.Head>
                <Table.Head class="w-[150px] text-right">Status</Table.Head>
                <Table.Head class="min-w-[180px]">Value</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each overviewGroups as group (group.name)}
                <Table.Row class="bg-muted/50 hover:bg-muted/50">
                  <Table.Cell colspan={4} class="py-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-medium">{group.name}</span>
                    </div>
                  </Table.Cell>
                </Table.Row>
                {#each group.rows as row (`${row.group}:${row.name}`)}
                  <Table.Row class={row.status === "unsupported" ? "text-muted-foreground" : ""}>
                    <Table.Cell class="whitespace-normal align-top">
                      <div class="grid gap-1">
                        <span class="font-medium">{row.name}</span>
                        {#if row.source}
                          <span class="hidden break-all text-xs text-muted-foreground md:inline">{row.source}</span>
                        {/if}
                      </div>
                    </Table.Cell>
                    <Table.Cell class="whitespace-normal align-top text-muted-foreground">{row.description}</Table.Cell>
                    <Table.Cell class="whitespace-normal align-top text-right">
                      <div class="flex justify-end">
                        <StatusBadge value={row.status} label={overviewStatusLabel(row.status)} help={row.source || row.name} />
                      </div>
                    </Table.Cell>
                    <Table.Cell class="whitespace-normal align-top">
                      <span class="break-words font-medium">{row.value || "not reported"}</span>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              {:else}
                <Table.Row>
                  <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">No getInfo fields reported.</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div class="grid gap-1">
          <Card.Title>Raw inspection data</Card.Title>
          <Card.Description>Full CTAP getInfo payload and JSON export.</Card.Description>
        </div>
        <Card.Action>
          <Button variant="outline" size="sm" type="button" onclick={copyReport}>Export JSON</Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <JsonView value={info} title="Raw CTAP getInfo" variant="bare" />
      </Card.Content>
    </Card.Root>
  </section>
{:else}
  <section class="grid gap-4">
    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div class="grid gap-1">
          <Card.Title>Overview</Card.Title>
          <Card.Description>Authenticator identity and CTAP capabilities.</Card.Description>
        </div>
        <Card.Action>
          <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading" : "Reload overview"}</Button>
        </Card.Action>
      </Card.Header>
    </Card.Root>

    {#if operationFailed(envelope)}
      <Alert variant="destructive">
        <AlertDescription>{operationFailed(envelope)}</AlertDescription>
      </Alert>
    {:else if loading}
      <Card.Root>
        <Card.Header>
          <Card.Title>Inspection in progress</Card.Title>
          <Card.Description>Reading authenticator metadata</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each ["Transport", "Session", "AAGUID", "Versions"] as label (label)}
                <Table.Row>
                  <Table.Cell class="w-[150px] text-muted-foreground">{label}</Table.Cell>
                  <Table.Cell><Skeleton class="h-5 w-24" /></Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {:else}
      <EmptyState title="Overview not loaded" message="Reload overview to inspect the selected authenticator.">
        {#snippet actions()}
          <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>Reload overview</Button>
        {/snippet}
      </EmptyState>
    {/if}
  </section>
{/if}
