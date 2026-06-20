<script lang="ts">
  import { operationFailed } from "$lib/api";
  import { loadOverview, loadOverviewMDS } from "$lib/controller";
  import { resultOf, sessionStateLabel } from "$lib/format";
  import {
    overviewBioSensorEnvelope,
    overviewEnvelope,
    overviewLoading,
    overviewMDSEnvelope,
    overviewMDSLoading,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    sessionStatus,
  } from "$lib/stores";
  import {
    buildOverviewConformanceWarnings,
    buildOverviewHero,
    buildOverviewHeroSignalGroups,
    buildOverviewMDSObservations,
    buildOverviewRows,
    groupOverviewRows,
  } from "$lib/overview-rules";
  import EmptyState from "../components/EmptyState.svelte";
  import { m } from "../paraglide/messages.js";
  import OverviewCapabilityMatrix from "../components/OverviewCapabilityMatrix.svelte";
  import OverviewConformanceWarnings from "../components/OverviewConformanceWarnings.svelte";
  import OverviewHeroCard from "../components/OverviewHeroCard.svelte";
  import OverviewLoadingCard from "../components/OverviewLoadingCard.svelte";
  import OverviewMDSObservations from "../components/OverviewMDSObservations.svelte";
  import OverviewRawInspectionData from "../components/OverviewRawInspectionData.svelte";

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
  let bioSensorReport = $derived(resultOf(bioSensorEnvelope));
  let hasReport = $derived(Boolean(report));

  let device = $derived(report?.device || $selectedDevice || {});
  let info = $derived(report?.info || {});

  let hero = $derived(buildOverviewHero({ info, device, mds: mdsResult || {}, mdsLoading, mdsError: mdsFailureMessage }));
  let signalGroups = $derived(buildOverviewHeroSignalGroups({ info }));
  let overviewRows = $derived(buildOverviewRows({ info, device, bioSensor: bioSensorReport || {} }));
  let overviewGroups = $derived(groupOverviewRows(overviewRows));
  let conformanceWarnings = $derived(buildOverviewConformanceWarnings({ info }));
  let mdsObservations = $derived(buildOverviewMDSObservations({ info, mds: mdsResult || {} }));
  let warningCount = $derived(overviewRows.filter((row) => row.status === "warning").length);
  let loadingRows = $derived([m.transport(), m.session(), "AAGUID", m.versions()]);
  let currentSessionLabel = $derived(sessionStateLabel($sessionStatus.state));

  function reloadOverview() {
    return loadOverview(selector);
  }

  function refreshMDS() {
    if (hero.aaguidAvailable) {
      return loadOverviewMDS(hero.aaguid, true, selector);
    }
  }

  async function copyReport() {
    await navigator.clipboard?.writeText(JSON.stringify(report ?? null, null, 2));
  }
</script>

{#if !selector}
  <EmptyState title={m.choose_authenticator()} message={m.choose_authenticator_message()} />
{:else if !hasReport && !loading && !failureMessage}
  <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()} />
{:else}
  <section class="overview-screen flow">
    {#if failureMessage}
      <div class="overview-alert" role="alert">{failureMessage}</div>
    {/if}

    {#if hasReport}
      <OverviewHeroCard
        {hero}
        {signalGroups}
        sessionState={$sessionStatus.state}
        sessionLabel={currentSessionLabel}
        {loading}
        {mdsLoading}
        {reloadDisabled}
        onReload={reloadOverview}
        onRefreshMDS={refreshMDS}
      />
      <OverviewConformanceWarnings warnings={conformanceWarnings} />
      <OverviewCapabilityMatrix groups={overviewGroups} {warningCount} />
      <OverviewMDSObservations observations={mdsObservations} />
      <OverviewRawInspectionData {info} onCopy={copyReport} />
    {:else if loading}
      <OverviewLoadingCard rows={loadingRows} />
    {/if}
  </section>
{/if}

<style>
  .overview-screen {
    min-width: 0;
    --flow-space: var(--space-4);
  }

  .overview-alert {
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-panel);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
    padding: var(--space-3) var(--space-4);
  }
</style>
