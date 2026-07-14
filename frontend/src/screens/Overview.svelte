<script lang="ts">
  import OverviewCapabilityMatrix from "$lib/components/overview/OverviewCapabilityMatrix.svelte";
  import OverviewConformance from "$lib/components/overview/OverviewConformance.svelte";
  import OverviewHeroCard from "$lib/components/overview/OverviewHeroCard.svelte";
  import OverviewLoadingCard from "$lib/components/overview/OverviewLoadingCard.svelte";
  import OverviewMDSObservations from "$lib/components/overview/OverviewMDSObservations.svelte";
  import OverviewRawInspectionData from "$lib/components/overview/OverviewRawInspectionData.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toast } from "svelte-sonner";
  import { copyToClipboard } from "$lib/clipboard";
  import { loadOverviewMDS, reloadOverview } from "$lib/controller";
  import { buildOverviewPresentation } from "$lib/overview-presentation";
  import {
    overviewBioSensor,
    overviewInspection,
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
    overviewState: $overviewInspection,
    overviewBioSensorState: $overviewBioSensor,
    overviewMDSState: $overviewMDS,
  }));

  async function refreshMDS() {
    if (overview.hero.aaguidAvailable) {
      const refreshed = await loadOverviewMDS(overview.hero.aaguid, true);
      if (refreshed) toast.success(m.mds_refresh_complete());
    }
  }

  async function copyReport() {
    await copyToClipboard(overview.rawInspectionJson, m.json_copied());
  }
</script>

{#if !overview.selector}
  <EmptyState title={m.choose_authenticator()} message={m.choose_authenticator_message()} />
{:else if !overview.hasReport && !overview.loading && !overview.failureMessage && overview.degradedMessages.length === 0}
  <EmptyState title={m.overview_not_loaded()} message={m.overview_not_loaded_message()} />
{:else}
  <section class="overview-screen flow">
    {#each overview.degradedMessages as message (message)}
      <Alert.Root variant="warning" role="status">
        <Alert.Description>{message}</Alert.Description>
      </Alert.Root>
    {/each}

    {#if overview.failureMessage}
      <Alert.Root variant="destructive" role="alert">
        <Alert.Description>{overview.failureMessage}</Alert.Description>
        {#if !overview.hasReport}
          <Alert.Action>
            <Button variant="outline" size="sm" type="button" disabled={overview.reloadDisabled} onclick={reloadOverview}>
              {m.reload_overview()}
            </Button>
          </Alert.Action>
        {/if}
      </Alert.Root>
    {/if}

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
      <OverviewRawInspectionData result={overview.report} onCopy={copyReport} />
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
