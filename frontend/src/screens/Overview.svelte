<script lang="ts">
  import { Award, Boxes, Cpu, Database, Fingerprint, IdCard, Info, KeyRound, ListChecks, Puzzle, Settings2, ShieldCheck, SlidersHorizontal, TriangleAlert } from "@lucide/svelte";
  import { operationFailed } from "$lib/api";
  import { loadOverview } from "$lib/controller";
  import { overviewBioSensorEnvelope, overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { resultOf, sessionStateLabel } from "$lib/format";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import {
    buildOverviewConformanceWarnings,
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
  let conformanceWarnings = $derived(buildOverviewConformanceWarnings({ info }));
  let overviewGroups = $derived(groupOverviewRows(overviewRows));
  let warningOverviewRows = $derived(overviewRows.filter((row) => row.status === "warning"));

  function summaryIcon(title: string) {
    const icons: Record<string, typeof ShieldCheck> = {
      Protocol: ShieldCheck,
      Verification: Fingerprint,
      Passkeys: KeyRound,
      Storage: Database,
      Administration: Settings2,
    };
    return icons[title] || Info;
  }

  function groupIcon(name: string) {
    const icons: Record<string, typeof ShieldCheck> = {
      Identity: IdCard,
      Protocol: Cpu,
      Verification: Fingerprint,
      Storage: Database,
      Management: ListChecks,
      Policy: SlidersHorizontal,
      Extensions: Puzzle,
      Limits: Boxes,
      Attestation: Award,
    };
    return icons[name] || Info;
  }

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

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {#each summaryCards as card (card.title)}
        {@const SummaryIcon = summaryIcon(card.title)}
        <Card.Root size="sm">
          <Card.Header class="gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground" aria-hidden="true">
                  <SummaryIcon size={18} strokeWidth={2.1} />
                </span>
                <div class="grid min-w-0 gap-1">
                  <Card.Title class="truncate text-base">{card.title}</Card.Title>
                  <StatusBadge value={card.status} label={card.statusLabel} help={card.title} />
                </div>
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger
                  class={buttonVariants({ variant: "ghost", size: "icon-xs" })}
                  type="button"
                  aria-label={`About ${card.title}`}
                >
                  <Info size={14} />
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={6} class="max-w-64 leading-5">
                  <p>{card.description}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </Card.Header>
          <Card.Content class="grid text-sm">
            {#each card.facts as fact (fact.label)}
              <div class="flex min-h-8 items-start justify-between gap-3 border-t py-2 first:border-t-0" class:text-muted-foreground={fact.status === "unsupported" || fact.status === "unknown"}>
                <span class="flex min-w-0 items-center gap-1.5">
                  <span>{fact.label}</span>
                  {#if fact.help}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        class={buttonVariants({ variant: "ghost", size: "icon-xs" })}
                        type="button"
                        aria-label={`About ${fact.label}`}
                      >
                        <Info size={12} />
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={6} class="max-w-80 leading-5">
                        <p>{fact.help}</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {/if}
                </span>
                <span class="max-w-[58%] text-right font-medium break-words">{fact.value}</span>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    {#if conformanceWarnings.length}
      <Alert variant="destructive">
        <TriangleAlert/>
        <AlertTitle>Conformance warnings</AlertTitle>
        <AlertDescription class="col-start-2 grid gap-3 text-foreground">
          <p class="text-muted-foreground">These CTAP values conflict with conformance expectations or required feature relationships.</p>
          <div class="overflow-x-auto rounded-md border bg-card/80">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="min-w-55">Warning</Table.Head>
                  <Table.Head class="min-w-55">Finding</Table.Head>
                  <Table.Head class="min-w-55">Source</Table.Head>
                  <Table.Head class="min-w-70">Description</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each conformanceWarnings as warning (`${warning.name}:${warning.source}`)}
                  <Table.Row>
                    <Table.Cell class="whitespace-normal align-top font-medium">{warning.name}</Table.Cell>
                    <Table.Cell class="whitespace-normal align-top">
                      <span class="wrap-break-word font-medium">{warning.value || "not reported"}</span>
                    </Table.Cell>
                    <Table.Cell class="whitespace-normal align-top text-muted-foreground">
                      <span class="break-all">{warning.source}</span>
                    </Table.Cell>
                    <Table.Cell class="whitespace-normal align-top text-muted-foreground">{warning.description}</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </AlertDescription>
      </Alert>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Capability Matrix</Card.Title>
        <Card.Description>CTAP 2.3 getInfo capabilities, limits, extensions, and certification hints.</Card.Description>
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
                <Table.Head class="min-w-45">Name</Table.Head>
                <Table.Head class="min-w-65">Description</Table.Head>
                <Table.Head class="w-40 text-right">Status</Table.Head>
                <Table.Head class="min-w-45">Value</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each overviewGroups as group (group.name)}
                {@const GroupIcon = groupIcon(group.name)}
                <Table.Row class="bg-muted/50">
                  <Table.Cell colspan={4} class="py-2">
                    <span class="flex items-center gap-2">
                      <GroupIcon class="text-muted-foreground" />
                      <span>{group.name}</span>
                    </span>
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
                      <span class="wrap-break-word font-medium">{row.value || "not reported"}</span>
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
      <Card.Header>
          <Card.Title>Raw inspection data</Card.Title>
        <Card.Description><code>ctapkit</code> raw operation response.</Card.Description>
        <Card.Action>
          <Button variant="outline" size="sm" type="button" onclick={copyReport}>Copy JSON</Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <JsonView value={info} variant="code" />
      </Card.Content>
    </Card.Root>
  </section>
{:else}
  <section class="grid gap-4">
    <Card.Root>
      <Card.Header>
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
