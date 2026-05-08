<script lang="ts">
  import { operationFailed } from "$lib/api";
  import { loadOverview } from "$lib/controller";
  import { overviewBioSensorEnvelope, overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { resultOf, sessionStateLabel } from "$lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    buildOverviewRows,
    formatAlgorithm,
    groupOverviewRows,
    inlineList,
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
  let versions = $derived(Array.isArray(info?.versions) ? info.versions : []);
  let transports = $derived(Array.isArray(info?.transports) ? info.transports : []);
  let algorithms = $derived(Array.isArray(info?.algorithms) ? info.algorithms : []);
  let attestationFormats = $derived(Array.isArray(info?.attestationFormats) ? info.attestationFormats : []);
  let pinUvProtocols = $derived(Array.isArray(info?.pinUvAuthProtocols) ? info.pinUvAuthProtocols : []);
  let productName = $derived([device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator");
  let protocolLabel = $derived(versions.join(", ") || "unknown");
  let transportLabel = $derived(transports.length ? transports.join(", ") : device.transport || "unknown");
  let overviewRows = $derived(buildOverviewRows({ info, device, bioSensor: bioSensorReport || {} }));
  let overviewGroups = $derived(groupOverviewRows(overviewRows));
  let warningOverviewRows = $derived(overviewRows.filter((row) => row.status === "warning"));
  let heroFacts = $derived([
    { label: "AAGUID", value: info.aaguid || "not reported" },
    { label: "Transport", value: transportLabel },
    { label: "Protocol", value: protocolLabel },
    { label: "Device ID", value: device.deviceId || "not reported" },
  ]);
  let technicalRows = $derived([
    { label: "Transports", value: transportLabel },
    { label: "Algorithms", value: algorithms.length ? inlineList(algorithms.map(formatAlgorithm)) : "not reported" },
    { label: "Attestation", value: inlineList(attestationFormats, "not reported") },
    { label: "PIN/UV protocols", value: inlineList(pinUvProtocols, "not reported") },
    { label: "Max message size", value: info.maxMsgSize ? `${info.maxMsgSize} bytes` : "not reported" },
    { label: "Max credential length", value: info.maxCredentialLength ? `${info.maxCredentialLength} bytes` : "not reported" },
    { label: "Max serialized large-blob array", value: info.maxSerializedLargeBlobArray ? `${info.maxSerializedLargeBlobArray} bytes` : "not reported" },
  ]);

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
      <Card.Content>
        <Table.Root>
          <Table.Body>
            {#each heroFacts as fact (fact.label)}
              <Table.Row>
                <Table.Cell class="w-[150px] text-muted-foreground">{fact.label}</Table.Cell>
                <Table.Cell class="whitespace-normal break-words font-medium">{fact.value}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    {#if operationFailed(envelope)}
      <Alert variant="destructive">
        <AlertDescription>{operationFailed(envelope)}</AlertDescription>
      </Alert>
    {/if}

    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div class="grid gap-1">
          <Card.Title>GetInfo capability rules</Card.Title>
          <Card.Description>CTAP 2.2 authenticatorGetInfo fields interpreted with explicit option, extension, and limit semantics</Card.Description>
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
          <Card.Title>Technical details</Card.Title>
          <Card.Description>Raw CTAP getInfo, transports, algorithms, attestation, and JSON export</Card.Description>
        </div>
        <Card.Action>
          <Button variant="outline" size="sm" type="button" onclick={copyReport}>Export JSON</Button>
        </Card.Action>
      </Card.Header>
      <Card.Content class="grid gap-4">
        <Table.Root>
          <Table.Body>
            {#each technicalRows as row (row.label)}
              <Table.Row>
                <Table.Cell class="w-[220px] text-muted-foreground">{row.label}</Table.Cell>
                <Table.Cell class="whitespace-normal break-words font-medium">{row.value}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
        <Separator />
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
