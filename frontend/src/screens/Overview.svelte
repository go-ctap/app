<script module lang="ts">
  import {
    Award,
    Boxes,
    Cpu,
    Database,
    FingerprintPattern,
    IdCard,
    Info,
    KeyRound,
    ListChecks,
    Puzzle,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    TriangleAlert,
  } from "@lucide/svelte";

  const SUMMARY_ICONS: Record<string, typeof ShieldCheck> = {
    Protocol: ShieldCheck,
    Verification: FingerprintPattern,
    Passkeys: KeyRound,
    Storage: Database,
    Administration: Settings2,
  };

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

  const LOADING_ROWS = ["Transport", "Session", "AAGUID", "Versions"] as const;
</script>

<script lang="ts">
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
    type OverviewSummaryCard,
  } from "$lib/overview-rules";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let selector = $derived($selectedSelector);
  let envelope = $derived($overviewEnvelope);
  let bioSensorEnvelope = $derived($overviewBioSensorEnvelope);
  let loading = $derived($overviewLoading);
  let failureMessage = $derived(operationFailed(envelope));
  let reloadDisabled = $derived(loading || $sessionBusy);
  let report = $derived(resultOf(envelope));
  let hasReport = $derived(Boolean(report));
  let bioSensorReport = $derived(resultOf(bioSensorEnvelope));
  let device = $derived(report?.device || $selectedDevice || {});
  let info = $derived(report?.info || {});
  let productName = $derived([device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator");
  let title = $derived(hasReport ? productName : "Overview");
  let description = $derived(hasReport ? device.deviceId || "Current authenticator overview" : "Authenticator identity and CTAP capabilities.");
  let summaryCards = $derived(buildOverviewSummaryCards({ info }));
  let overviewRows = $derived(buildOverviewRows({ info, device, bioSensor: bioSensorReport || {} }));
  let conformanceWarnings = $derived(buildOverviewConformanceWarnings({ info }));
  let overviewGroups = $derived(groupOverviewRows(overviewRows));
  let warningCount = $derived(overviewRows.filter((row) => row.status === "warning").length);

  async function copyReport() {
    await navigator.clipboard?.writeText(JSON.stringify(report ?? null, null, 2));
  }
</script>

{#snippet reloadButton()}
  <Button onclick={() => loadOverview(selector)} disabled={reloadDisabled}>{loading ? "Reloading" : "Reload overview"}</Button>
{/snippet}

{#snippet infoTooltip(label: string, text: string, size = 14, contentClass = "max-w-64")}
  <Tooltip.Root>
    <Tooltip.Trigger
      class={buttonVariants({ variant: "ghost", size: "icon-xs" })}
      type="button"
      aria-label={`About ${label}`}
    >
      <Info size={size} />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={6} class={`${contentClass} leading-5`}>
      <p>{text}</p>
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet summaryCard(card: OverviewSummaryCard)}
  {@const SummaryIcon = SUMMARY_ICONS[card.title] || Info}
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
        {@render infoTooltip(card.title, card.description)}
      </div>
    </Card.Header>
    <Card.Content class="grid text-sm">
      {#each card.facts as fact (fact.label)}
        <div class="flex min-h-8 items-start justify-between gap-3 border-t py-2 first:border-t-0" class:text-muted-foreground={fact.status === "unsupported" || fact.status === "unknown"}>
          <span class="flex min-w-0 items-center gap-1.5">
            <span>{fact.label}</span>
            {#if fact.help}
              {@render infoTooltip(fact.label, fact.help, 12, "max-w-80")}
            {/if}
          </span>
          <span class="max-w-[58%] text-right font-medium break-words">{fact.value}</span>
        </div>
      {/each}
    </Card.Content>
  </Card.Root>
{/snippet}

{#if !selector}
  <EmptyState title="Choose an authenticator" message="Connect a token and select it in the top bar." />
{:else}
  <section class="grid gap-4">
    <Card.Root>
      <Card.Header>
        <div class="grid gap-2">
          {#if hasReport}
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Overview</Badge>
              <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
            </div>
          {/if}
          <Card.Title class={hasReport ? "text-2xl" : ""}>{title}</Card.Title>
          <Card.Description class={hasReport ? "break-all" : ""}>{description}</Card.Description>
        </div>
        <Card.Action>
          {@render reloadButton()}
        </Card.Action>
      </Card.Header>
    </Card.Root>

    {#if failureMessage}
      <Alert variant="destructive">
        <AlertDescription>{failureMessage}</AlertDescription>
      </Alert>
    {/if}

    {#if hasReport}
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {#each summaryCards as card (card.title)}
          {@render summaryCard(card)}
        {/each}
      </div>

      {#if conformanceWarnings.length}
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Conformance warnings</AlertTitle>
          <AlertDescription class="col-start-2 grid gap-3 text-foreground">
            <p class="text-muted-foreground">These CTAP values conflict with conformance expectations or required feature relationships.</p>
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
          </AlertDescription>
        </Alert>
      {/if}

      <Card.Root>
        <Card.Header>
          <Card.Title>Capability Matrix</Card.Title>
          <Card.Description>CTAP 2.3 getInfo capabilities, limits, extensions, and certification hints.</Card.Description>
          <Card.Action>
            {#if warningCount}
              <Badge variant="secondary">{warningCount} warning{warningCount === 1 ? "" : "s"}</Badge>
            {/if}
          </Card.Action>
        </Card.Header>
        <Card.Content>
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
                {@const GroupIcon = GROUP_ICONS[group.name] || Info}
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
                      <StatusBadge value={row.status} label={overviewStatusLabel(row.status)} help={row.source || row.name} />
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
        </Card.Content>
      </Card.Root>

      <details class="rounded-xl border bg-card text-sm shadow-xs ring-1 ring-foreground/10">
        <summary class="cursor-pointer px-6 py-4 font-medium">Raw inspection data</summary>
        <div class="grid gap-3 border-t px-6 pt-4 pb-6">
          <div class="flex items-center justify-between gap-3 text-muted-foreground">
            <span><code>ctapkit</code> raw operation response.</span>
            <Button variant="outline" size="sm" type="button" onclick={copyReport}>Copy JSON</Button>
          </div>
          <JsonView value={info} variant="code" />
        </div>
      </details>
    {:else if loading}
      <Card.Root>
        <Card.Header>
          <Card.Title>Inspection in progress</Card.Title>
          <Card.Description>Reading authenticator metadata</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each LOADING_ROWS as label (label)}
                <Table.Row>
                  <Table.Cell class="w-[150px] text-muted-foreground">{label}</Table.Cell>
                  <Table.Cell><Skeleton class="h-5 w-24" /></Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {:else if !failureMessage}
      <EmptyState title="Overview not loaded" message="Reload overview to inspect the selected authenticator.">
        {#snippet actions()}
          {@render reloadButton()}
        {/snippet}
      </EmptyState>
    {/if}
  </section>
{/if}
