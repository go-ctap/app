<script lang="ts">
  import OverviewCapabilityMatrix from "$lib/components/overview/OverviewCapabilityMatrix.svelte";
  import OverviewConformance from "$lib/components/overview/OverviewConformance.svelte";
  import OverviewHeroCard from "$lib/components/overview/OverviewHeroCard.svelte";
  import OverviewLoadingCard from "$lib/components/overview/OverviewLoadingCard.svelte";
  import OverviewMDSObservations from "$lib/components/overview/OverviewMDSObservations.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toast } from "svelte-sonner";
  import { loadOverviewMDS, reloadOverview } from "$lib/controller";
  import { buildOverviewPresentation } from "$lib/overview-presentation";
  import {
    overviewBioSensor,
    authenticatorInspection,
    overviewMDS,
    selectedDevice,
    selectedSelector,
    sessionBusy,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let overview = $derived(buildOverviewPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    sessionBusy: $sessionBusy,
    overviewState: $authenticatorInspection,
    overviewBioSensorState: $overviewBioSensor,
    overviewMDSState: $overviewMDS,
  }));

  async function refreshMDS() {
    if (overview.hero.aaguidAvailable) {
      const refreshed = await loadOverviewMDS(overview.hero.aaguid, true);
      if (refreshed) toast.success(m.mds_refresh_complete());
    }
  }
</script>

{#if overview.selector && !overview.hasReport && !overview.loading}
  <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()}>
    {#snippet actions()}
      <Button type="button" disabled={overview.reloadDisabled} onclick={reloadOverview}>
        {m.reload_overview()}
      </Button>
    {/snippet}
  </EmptyState>
{:else if overview.selector}
  <section class="overview-screen flow">
    {#if overview.hasReport}
      <OverviewHeroCard
        hero={overview.hero}
        signalGroups={overview.signalGroups}
        loading={overview.loading}
        mdsLoading={overview.mdsLoading}
        reloadDisabled={overview.reloadDisabled}
        onReload={reloadOverview}
        onRefreshMDS={refreshMDS}
      />
      {#if overview.conformance}
        {#key overview.info}
          <OverviewConformance presentation={overview.conformance} />
        {/key}
      {/if}
      <OverviewCapabilityMatrix groups={overview.overviewGroups} warningCount={overview.warningCount} />
      <OverviewMDSObservations observations={overview.mdsObservations} />
      <JsonDisclosure value={overview.report} />
    {:else if overview.loading}
      <OverviewLoadingCard />
    {/if}
  </section>
{/if}

<style>
@layer blocks {
    .overview-screen {
      min-width: 0;
      --flow-space: var(--space-4);
    }
}
</style>
