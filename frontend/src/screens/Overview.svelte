<script lang="ts">
  import { loadOverview, loadOverviewMDS } from "$lib/controller";
  import {
    overviewBioSensorEnvelope,
    overviewEnvelope,
    overviewLoading,
    overviewMDSLookup,
    overviewMDSLoading,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    sessionStatus,
  } from "$lib/stores";
  import { buildOverviewViewModel } from "$lib/overview-view-model";
  import EmptyState from "../components/EmptyState.svelte";
  import { m } from "../paraglide/messages.js";
  import OverviewCapabilityMatrix from "../components/OverviewCapabilityMatrix.svelte";
  import OverviewConformanceWarnings from "../components/OverviewConformanceWarnings.svelte";
  import OverviewHeroCard from "../components/OverviewHeroCard.svelte";
  import OverviewLoadingCard from "../components/OverviewLoadingCard.svelte";
  import OverviewMDSObservations from "../components/OverviewMDSObservations.svelte";
  import OverviewRawInspectionData from "../components/OverviewRawInspectionData.svelte";

  let overview = $derived(buildOverviewViewModel({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    sessionStatus: $sessionStatus,
    sessionBusy: $sessionBusy,
    overviewEnvelope: $overviewEnvelope,
    overviewBioSensorEnvelope: $overviewBioSensorEnvelope,
    overviewMDSLookup: $overviewMDSLookup,
    overviewLoading: $overviewLoading,
    overviewMDSLoading: $overviewMDSLoading,
  }));

  function reloadOverview() {
    return loadOverview(overview.selector);
  }

  function refreshMDS() {
    if (overview.hero.aaguidAvailable) {
      return loadOverviewMDS(overview.hero.aaguid, true, overview.selector);
    }
  }

  async function copyReport() {
    await navigator.clipboard?.writeText(overview.rawInspectionJson);
  }
</script>

{#if !overview.selector}
  <EmptyState title={m.choose_authenticator()} message={m.choose_authenticator_message()} />
{:else if !overview.hasReport && !overview.loading && !overview.failureMessage}
  <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()} />
{:else}
  <section class="overview-screen flow">
    {#if overview.failureMessage}
      <div class="overview-alert" role="alert">{overview.failureMessage}</div>
    {/if}

    {#if overview.hasReport}
      <OverviewHeroCard
        hero={overview.hero}
        signalGroups={overview.signalGroups}
        sessionState={overview.sessionState}
        sessionLabel={overview.sessionLabel}
        loading={overview.loading}
        mdsLoading={overview.mdsLoading}
        reloadDisabled={overview.reloadDisabled}
        onReload={reloadOverview}
        onRefreshMDS={refreshMDS}
      />
      <OverviewConformanceWarnings warnings={overview.conformanceWarnings} />
      <OverviewCapabilityMatrix groups={overview.overviewGroups} warningCount={overview.warningCount} />
      <OverviewMDSObservations observations={overview.mdsObservations} />
      <OverviewRawInspectionData info={overview.info} onCopy={copyReport} />
    {:else if overview.loading}
      <OverviewLoadingCard rows={overview.loadingRows} />
    {/if}
  </section>
{/if}

<style>
@layer blocks {
    .overview-screen {
      min-width: 0;
      --flow-space: var(--space-4);
    }

    .overview-alert {
      border: 1px solid color-mix(in srgb, var(--destructive) 34%, var(--border));
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--destructive) 10%, var(--background));
      color: var(--destructive);
      padding: var(--space-3) var(--space-4);
    }
}
</style>
