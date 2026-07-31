<script lang="ts">
  import OverviewCapabilityMatrix from "$lib/components/overview/OverviewCapabilityMatrix.svelte";
  import OverviewConformance from "$lib/components/overview/OverviewConformance.svelte";
  import OverviewHeroCard from "$lib/components/overview/OverviewHeroCard.svelte";
  import OverviewLoadingCard from "$lib/components/overview/OverviewLoadingCard.svelte";
  import OverviewMDSObservations from "$lib/components/overview/OverviewMDSObservations.svelte";
  import OverviewStandardCapabilities from "$lib/components/overview/OverviewStandardCapabilities.svelte";
  import OverviewStandardHeroCard from "$lib/components/overview/OverviewStandardHeroCard.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { selectedDevice, selectedSelector } from "$lib/features/authenticator";
  import {
    authenticatorInspection,
    loadOverviewMDS,
    overviewBioSensor,
    overviewMDS,
    reloadOverview,
  } from "$lib/features/overview";
  import { buildOverviewPresentation } from "$lib/overview-presentation";
  import { advancedMode } from "$lib/preferences";

  import { m } from "../paraglide/messages.js";

  let overview = $derived(
    buildOverviewPresentation({
      selectedSelector: $selectedSelector,
      selectedDevice: $selectedDevice,
      overviewState: $authenticatorInspection,
      overviewBioSensorState: $overviewBioSensor,
      overviewMDSState: $overviewMDS,
    }),
  );

  async function refreshMDS() {
    if (overview.hero.aaguidAvailable) {
      const refreshed = await loadOverviewMDS(overview.hero.aaguid, true);

      if (refreshed) toast.success(m.mds_refresh_complete());
    }
  }
</script>

{#if overview.selector && overview.failed}
  <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()}>
    {#snippet actions()}
      <Button type="button" onclick={reloadOverview}>
        {m.reload_overview()}
      </Button>
    {/snippet}
  </EmptyState>
{:else if overview.selector}
  <section class="overview-screen flow">
    {#if overview.hasReport}
      {#if $advancedMode}
        <OverviewHeroCard
          hero={overview.hero}
          signalGroups={overview.signalGroups}
          mdsLoading={overview.mdsLoading}
          onRefreshMDS={refreshMDS}
        />

        {#if overview.conformance}
          {#key overview.info}
            <OverviewConformance presentation={overview.conformance} />
          {/key}
        {/if}

        <OverviewCapabilityMatrix
          groups={overview.overviewGroups}
          warningCount={overview.warningCount}
        />

        <OverviewMDSObservations observations={overview.mdsObservations} />

        <JsonDisclosure value={overview.report} />
      {:else if overview.standard}
        <OverviewStandardHeroCard hero={overview.hero} presentation={overview.standard} />

        {#if overview.conformance && overview.conformance.status !== "passed"}
          {#key overview.info}
            <OverviewConformance presentation={overview.conformance} />
          {/key}
        {/if}

        <OverviewStandardCapabilities presentation={overview.standard} />

        <OverviewMDSObservations observations={overview.mdsObservations} />
      {/if}
    {:else if overview.loading}
      <OverviewLoadingCard advanced={$advancedMode} />
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
