<script module lang="ts">
    import {
        Award,
        Boxes,
        Copy,
        Cpu,
        Database,
        ExternalLink,
        FingerprintPattern,
        IdCard,
        Info,
        KeyRound,
        ListChecks,
        Puzzle,
        RefreshCw,
        ShieldCheck,
        SlidersHorizontal,
        TriangleAlert,
    } from "@lucide/svelte";

    const SIGNAL_GROUP_ICONS: Record<string, typeof ShieldCheck> = {
        authentication: FingerprintPattern,
        "credentials-management": KeyRound,
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

</script>

<script lang="ts">
    import {operationFailed} from "$lib/api";
    import {loadOverview, loadOverviewMDS} from "$lib/controller";
    import {
        overviewBioSensorEnvelope,
        overviewEnvelope,
        overviewLoading,
        overviewMDSEnvelope,
        overviewMDSLoading,
        selectedDevice,
        selectedSelector,
        sessionBusy,
        sessionStatus
    } from "$lib/stores";
    import {resultOf, sessionStateLabel} from "$lib/format";
    import {Alert, AlertDescription, AlertTitle} from "$lib/components/ui/alert/index.js";
    import {Badge} from "$lib/components/ui/badge/index.js";
    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Skeleton} from "$lib/components/ui/skeleton/index.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import {
        buildOverviewConformanceWarnings,
        buildOverviewHero,
        buildOverviewHeroSignalGroups,
        buildOverviewMDSObservations,
        buildOverviewRows,
        groupOverviewRows,
        overviewStatusLabel,
        type OverviewHeroFact,
        type OverviewHeroSignal,
        type OverviewHeroSignalGroup,
        type OverviewMDSObservation,
    } from "$lib/overview-rules";
    import EmptyState from "../components/EmptyState.svelte";
    import JsonView from "../components/JsonView.svelte";
    import StatusBadge from "../components/StatusBadge.svelte";
    import {m} from "../paraglide/messages.js";

    let selector = $derived($selectedSelector);
    let envelope = $derived($overviewEnvelope);
    let bioSensorEnvelope = $derived($overviewBioSensorEnvelope);
    let mdsEnvelope = $derived($overviewMDSEnvelope);
    let loading = $derived($overviewLoading);
    let mdsLoading = $derived($overviewMDSLoading);
    let failureMessage = $derived(operationFailed(envelope));
    let mdsFailureMessage = $derived(operationFailed(mdsEnvelope));
    let reloadDisabled = $derived(loading || $sessionBusy);
    let report = $derived(resultOf(envelope));
    let mdsResult = $derived(resultOf(mdsEnvelope));
    let hasReport = $derived(Boolean(report));
    let bioSensorReport = $derived(resultOf(bioSensorEnvelope));
    let device = $derived(report?.device || $selectedDevice || {});
    let info = $derived(report?.info || {});
    let productName = $derived([device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || m.selected_authenticator());
    let title = $derived(hasReport ? productName : m.nav_overview());
    let description = $derived(hasReport ? device.deviceId || m.current_authenticator_overview() : m.authenticator_identity_capabilities());
    let hero = $derived(buildOverviewHero({info, device, mds: mdsResult || {}, mdsLoading, mdsError: mdsFailureMessage, sessionLabel: sessionStateLabel($sessionStatus.state)}));
    let signalGroups = $derived(buildOverviewHeroSignalGroups({info}));
    let overviewRows = $derived(buildOverviewRows({info, device, bioSensor: bioSensorReport || {}}));
    let conformanceWarnings = $derived(buildOverviewConformanceWarnings({info}));
    let mdsObservations = $derived(buildOverviewMDSObservations({info, mds: mdsResult || {}}));
    let overviewGroups = $derived(groupOverviewRows(overviewRows));
    let warningCount = $derived(overviewRows.filter((row) => row.status === "warning").length);
    let loadingRows = $derived([m.transport(), m.session(), "AAGUID", m.versions()]);

    async function copyReport() {
        await navigator.clipboard?.writeText(JSON.stringify(report ?? null, null, 2));
    }

    async function copyAaguid() {
        if (hero.aaguid && hero.aaguid !== m.not_reported()) {
            await navigator.clipboard?.writeText(hero.aaguid);
        }
    }

    function refreshMDS() {
        if (hero.aaguid && hero.aaguid !== m.not_reported()) {
            return loadOverviewMDS(hero.aaguid, true, selector);
        }
    }

    function mdsBadgeVariant(state: string): "secondary" | "outline" | "destructive" {
        if (state === "error") return "destructive";
        if (state === "found") return "secondary";
        return "outline";
    }

    function signalToneClass(status: OverviewHeroSignal["status"]) {
        if (status === "supported" || status === "configured" || status === "enabled") return "text-emerald-700 dark:text-emerald-400";
        if (status === "warning" || status === "not configured" || status === "disabled") return "text-amber-700 dark:text-amber-400";
        if (status === "informational") return "text-sky-700 dark:text-sky-400";
        return "text-muted-foreground";
    }

    function signalDotClass(status: OverviewHeroSignal["status"]) {
        if (status === "supported" || status === "configured" || status === "enabled") return "bg-emerald-500";
        if (status === "warning" || status === "not configured" || status === "disabled") return "bg-amber-500";
        if (status === "informational") return "bg-sky-500";
        return "bg-muted-foreground/40";
    }

    function factToneClass(fact: OverviewHeroFact) {
        if (fact.placeholder || fact.tone === "muted") return "text-muted-foreground";
        if (fact.tone === "success") return "text-emerald-700 dark:text-emerald-400";
        if (fact.tone === "warning") return "text-amber-700 dark:text-amber-400";
        if (fact.tone === "error") return "text-destructive";
        return "text-foreground";
    }

    function mdsObservationLabel(severity: OverviewMDSObservation["severity"]) {
        if (severity === "critical") return m.severity_critical();
        if (severity === "warning") return m.severity_warning();
        return m.severity_info();
    }

    function mdsObservationBadgeClass(severity: OverviewMDSObservation["severity"]) {
        if (severity === "critical") return "";
        if (severity === "warning") return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    }
</script>

{#snippet reloadButton(variant: "default" | "outline" | "ghost" = "default", size: "default" | "sm" = "default")}
  <Button {variant} {size} onclick={() => loadOverview(selector)}
          disabled={reloadDisabled}>{loading ? m.reloading() : m.reload_overview()}</Button>
{/snippet}

{#snippet infoTooltip(label: string, text: string, size = 14, contentClass = "max-w-64")}
  <Tooltip.Root>
    <Tooltip.Trigger
            class={buttonVariants({ variant: "ghost", size: "icon-xs" })}
            type="button"
            aria-label={m.about_label({ label })}
    >
      <Info size={size}/>
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={6} class={`${contentClass} leading-5`}>
      <p>{text}</p>
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet heroSignal(signal: OverviewHeroSignal)}
  <div class="overview-signal-row grid min-w-0 gap-1.5 border-t py-2.5 first:border-t-0">
    <div class="overview-signal-header flex min-w-0 items-start justify-between gap-3">
      <div class="grid min-w-0 gap-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="min-w-0 text-sm font-medium leading-5">{signal.title}</span>
          {@render infoTooltip(signal.title, signal.tooltip, 12, "max-w-96")}
        </div>
        <div class="overview-signal-meta flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
          <code class="overview-signal-code inline-flex max-w-full items-center gap-1 overflow-hidden truncate whitespace-nowrap rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground" title={`${signal.flag} = ${signal.value}`}>
            <span class="truncate">{signal.flag}</span>
            <span class="text-muted-foreground/60">=</span>
            <span class="text-foreground/80">{signal.value}</span>
          </code>
        </div>
      </div>
      <div class="overview-signal-status flex shrink-0 items-center gap-1.5 pt-0.5" title={signal.tooltip}>
        <span class={`size-1.5 rounded-full ${signalDotClass(signal.status)}`} aria-hidden="true"></span>
        <span class={`text-right text-xs font-semibold ${signalToneClass(signal.status)}`}>{signal.statusLabel}</span>
      </div>
    </div>
  </div>
{/snippet}

{#snippet heroSignalGroup(group: OverviewHeroSignalGroup)}
  {@const GroupIcon = SIGNAL_GROUP_ICONS[group.id] || Info}
  <section class="grid min-w-0 content-start">
    <div class="flex items-center gap-2 border-b pb-2">
      <GroupIcon class="size-4 text-muted-foreground" strokeWidth={2.1}/>
      <h3 class="truncate text-sm font-semibold">{group.title}</h3>
    </div>
    <div class="grid min-w-0">
      {#each group.signals as signal (signal.id)}
        {@render heroSignal(signal)}
      {/each}
    </div>
  </section>
{/snippet}

{#snippet metadataFact(fact: OverviewHeroFact)}
  <div class="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 border-t py-2 first:border-t-0">
    <dt class="text-xs text-muted-foreground">{fact.label}</dt>
    <dd class={`m-0 min-w-0 truncate text-right text-xs font-medium ${factToneClass(fact)}`}>
      {#if fact.href && !fact.placeholder}
        <a class="inline-flex max-w-full items-center justify-end gap-1 truncate underline-offset-4 hover:underline" href={fact.href} target="_blank" rel="noreferrer" title={fact.href}>
          <span class="truncate">{fact.value}</span>
          <ExternalLink size={11} class="shrink-0"/>
        </a>
      {:else}
        {fact.value}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet mdsAaguid()}
  <div class="grid min-w-0 gap-1 border-t pt-3">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <span class="text-xs text-muted-foreground">{m.mds_aaguid()}</span>
      {#if hero.aaguid && hero.aaguid !== m.not_reported()}
        <Button variant="ghost" size="icon-xs" type="button" onclick={copyAaguid} aria-label={m.copy_label({ label: "AAGUID" })}>
          <Copy size={12}/>
        </Button>
      {/if}
    </div>
    <code class="block min-w-0 truncate font-mono text-xs font-medium text-foreground" title={hero.aaguid}>{hero.aaguid}</code>
  </div>
{/snippet}

{#if !selector}
  <EmptyState title={m.choose_authenticator()} message={m.choose_authenticator_message()}/>
{:else}
  <section class="grid gap-4">
    {#if hasReport}
      <div class="overview-hero-card">
        <Card.Root class="overflow-hidden py-0">
          <Card.Content class="grid gap-0 p-0">
            <div class="overview-hero-layout grid min-w-0">
              <div class="grid min-w-0 gap-5 p-4 lg:p-5">
                <div class="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="flex min-w-0 items-start gap-3">
                    <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
                      {#if hero.iconSrc}
                        <img src={hero.iconSrc} alt="" class="size-full object-contain p-2" />
                      {:else}
                        <ShieldCheck size={23} strokeWidth={2.1}/>
                      {/if}
                    </div>
                    <div class="grid min-w-0 gap-1.5">
                      <div class="flex flex-wrap items-center gap-2">
                        <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)}/>
                        <Badge variant={mdsBadgeVariant(hero.mdsState)}>{hero.mdsStateLabel}</Badge>
                      </div>
                      <h1 class="truncate text-xl font-semibold tracking-normal md:text-2xl">{hero.title}</h1>
                      <p class="line-clamp-2 max-w-3xl text-sm text-muted-foreground">{hero.subtitle}</p>
                    </div>
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                    {@render reloadButton("outline", "sm")}
                  </div>
                </div>

                <div class="grid min-w-0 gap-4">
                  <div class="grid min-w-0 content-start gap-2">
                    <p class="text-xs font-medium uppercase text-muted-foreground">{m.overview_hero_heading()}</p>
                    <h2 class="text-balance text-2xl font-semibold leading-8 tracking-normal">{m.overview_hero_title()}</h2>
                    <p class="max-w-3xl text-sm leading-6 text-muted-foreground">{m.overview_hero_description()}</p>
                  </div>

                  <div class="overview-signal-grid grid min-w-0 gap-5">
                    {#each signalGroups as group (group.id)}
                      {@render heroSignalGroup(group)}
                    {/each}
                  </div>
                </div>
              </div>

              <aside class="overview-mds-panel grid min-w-0 content-start gap-3 bg-muted/15 p-4 lg:p-5" aria-label={m.metadata_service()}>
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div class="grid min-w-0 gap-1">
                    <h2 class="truncate text-sm font-semibold">{m.metadata_service()}</h2>
                    <p class="line-clamp-2 text-xs leading-5 text-muted-foreground">{hero.mdsDescription}</p>
                  </div>
                  <Button variant="outline" size="sm" type="button" onclick={refreshMDS} disabled={mdsLoading || !hero.aaguid || hero.aaguid === m.not_reported()}>
                    <RefreshCw size={14} class={mdsLoading ? "animate-spin" : ""}/>
                    {mdsLoading ? m.mds_refreshing() : m.mds_refresh()}
                  </Button>
                </div>

                {@render mdsAaguid()}

                <dl class="grid min-w-0">
                  {#each hero.mdsFacts as fact (fact.label)}
                    {@render metadataFact(fact)}
                  {/each}
                </dl>

                <div class="grid gap-1 border-t py-3 text-xs text-muted-foreground">
                  <div class="flex min-w-0 justify-between gap-3">
                    <span>{m.mds_blob_source()}</span>
                    <span class="truncate text-right font-medium">{hero.mdsBlobSource}</span>
                  </div>
                  <div class="flex min-w-0 justify-between gap-3">
                    <span>{m.mds_snapshot_saved()}</span>
                    <span class="truncate text-right font-medium">{hero.mdsSnapshotSaved}</span>
                  </div>
                  <div class="flex min-w-0 justify-between gap-3">
                    <span>{m.mds_blob_number()}</span>
                    <span class="truncate text-right font-medium">{hero.mdsBlobNumber}</span>
                  </div>
                </div>
              </aside>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    {:else}
      <Card.Root>
        <Card.Header>
          <div class="grid gap-2">
            <Card.Title>{title}</Card.Title>
            <Card.Description>{description}</Card.Description>
          </div>
          <Card.Action>
            {@render reloadButton()}
          </Card.Action>
        </Card.Header>
      </Card.Root>
    {/if}

    {#if failureMessage}
      <Alert variant="destructive">
        <AlertDescription>{failureMessage}</AlertDescription>
      </Alert>
    {/if}

    {#if hasReport}
      {#if conformanceWarnings.length}
        <Alert variant="destructive">
          <TriangleAlert/>
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
                {#each conformanceWarnings as warning (`${warning.name}:${warning.source}`)}
                  <Table.Row>
                    <Table.Cell
                            class="whitespace-normal align-top font-medium">{warning.name}</Table.Cell>
                    <Table.Cell class="whitespace-normal align-top">
                      <span class="wrap-break-word font-medium">{warning.value || m.not_reported()}</span>
                    </Table.Cell>
                    <Table.Cell class="whitespace-normal align-top text-muted-foreground">
                      <span class="break-all">{warning.source}</span>
                    </Table.Cell>
                    <Table.Cell
                            class="whitespace-normal align-top text-muted-foreground">{warning.description}</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </AlertDescription>
        </Alert>
      {/if}

      <Card.Root>
        <Card.Header>
          <Card.Title>{m.capability_matrix()}</Card.Title>
          <Card.Description>{m.capability_matrix_description()}</Card.Description>
          <Card.Action>
            {#if warningCount}
              <Badge variant="secondary">{m.warnings_count({count: warningCount})}</Badge>
            {/if}
          </Card.Action>
        </Card.Header>
        <Card.Content>
          <div class="rounded-md border">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="min-w-45">{m.name()}</Table.Head>
                  <Table.Head class="min-w-65">{m.description()}</Table.Head>
                  <Table.Head class="w-40 text-right">{m.status()}</Table.Head>
                  <Table.Head class="min-w-45">{m.value()}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each overviewGroups as group (group.name)}
                  {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
                  <Table.Row class="bg-muted/50">
                    <Table.Cell colspan={4} class="py-2">
                    <span class="flex items-center gap-2">
                      <GroupIcon class="text-muted-foreground"/>
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
                      <Table.Cell
                              class="whitespace-normal align-top text-muted-foreground">{row.description}</Table.Cell>
                      <Table.Cell class="whitespace-normal align-top text-right">
                        <StatusBadge value={row.status} label={overviewStatusLabel(row.status)}
                                     help={row.source || row.name}
                                     tone={row.status === "unsupported" ? "neutral" : "auto"}/>
                      </Table.Cell>
                      <Table.Cell class="whitespace-normal align-top">
                        <span class="wrap-break-word font-medium">{row.value || m.not_reported()}</span>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                {:else}
                  <Table.Row>
                    <Table.Cell colspan={4}
                                class="h-24 text-center text-muted-foreground">{m.no_getinfo_fields_reported()}</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>

      {#if mdsObservations.length}
        <details class="min-w-0 max-w-full overflow-hidden rounded-xl border bg-card text-sm shadow-xs ring-1 ring-foreground/10">
          <summary class="cursor-pointer px-6 py-4 font-medium">
            <span class="inline-flex flex-wrap items-center gap-2">
              <span>{m.mds_observations_title()}</span>
              <Badge variant="secondary">{m.items_count({count: mdsObservations.length})}</Badge>
            </span>
          </summary>
          <div class="grid min-w-0 gap-3 border-t px-6 pt-4 pb-6">
            <p class="text-sm text-muted-foreground">{m.mds_observations_description()}</p>
            <div class="max-w-full overflow-x-auto rounded-md border">
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
                  {#each mdsObservations as observation (`${observation.severity}:${observation.source}:${observation.finding}`)}
                    <Table.Row>
                      <Table.Cell class="whitespace-normal align-top">
                        <Badge variant={observation.severity === "critical" ? "destructive" : "outline"} class={mdsObservationBadgeClass(observation.severity)}>
                          {mdsObservationLabel(observation.severity)}
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
            </div>
          </div>
        </details>
      {/if}

      <details class="rounded-xl border bg-card text-sm shadow-xs ring-1 ring-foreground/10">
        <summary class="cursor-pointer px-6 py-4 font-medium">{m.raw_inspection_data()}</summary>
        <div class="grid gap-3 border-t px-6 pt-4 pb-6">
          <div class="flex items-center justify-between gap-3 text-muted-foreground">
            <span><code>ctapkit</code> {m.raw_operation_response()}</span>
            <Button variant="outline" size="sm" type="button" onclick={copyReport}>{m.copy_json()}</Button>
          </div>
          <JsonView value={info} variant="code"/>
        </div>
      </details>
    {:else if loading}
      <Card.Root>
        <Card.Header>
          <Card.Title>{m.inspection_in_progress()}</Card.Title>
          <Card.Description>{m.reading_authenticator_metadata()}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each loadingRows as label (label)}
                <Table.Row>
                  <Table.Cell class="w-35 text-muted-foreground">{label}</Table.Cell>
                  <Table.Cell>
                    <Skeleton class="h-5 w-24"/>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {:else if !failureMessage}
      <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()}>
        {#snippet actions()}
          {@render reloadButton()}
        {/snippet}
      </EmptyState>
    {/if}
  </section>
{/if}

<style>
  .overview-hero-card {
    container: overview-hero / inline-size;
  }

  .overview-hero-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .overview-signal-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .overview-mds-panel {
    border-top: 1px solid var(--color-border);
  }

  @container overview-hero (min-width: 46rem) {
    .overview-signal-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @container overview-hero (min-width: 70rem) {
    .overview-hero-layout {
      grid-template-columns: minmax(0, 1fr) minmax(20rem, 23.75rem);
    }

    .overview-mds-panel {
      border-top: 0;
      border-left: 1px solid var(--color-border);
    }
  }

  @container overview-hero (max-width: 34rem) {
    .overview-signal-header {
      flex-direction: column;
      gap: 0.375rem;
    }

    .overview-signal-status {
      align-self: flex-start;
      padding-top: 0;
    }

    .overview-signal-meta {
      row-gap: 0.375rem;
    }
  }
</style>
