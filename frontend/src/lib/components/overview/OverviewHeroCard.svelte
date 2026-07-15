<script module lang="ts">
  import { ShieldCheck } from "@lucide/svelte";
</script>

<script lang="ts">
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import type { OverviewHeroPresentation, OverviewHeroSignalGroup, OverviewMDSState } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";
  import OverviewMetadataPanel from "./OverviewMetadataPanel.svelte";
  import OverviewSignalGroup from "./OverviewSignalGroup.svelte";

  let {
    hero,
    signalGroups = [],
    mdsLoading = false,
    onRefreshMDS = () => {},
  }: {
    hero: OverviewHeroPresentation;
    signalGroups?: OverviewHeroSignalGroup[];
    mdsLoading?: boolean;
    onRefreshMDS?: () => void | Promise<void>;
  } = $props();

  function mdsTone(state: OverviewMDSState) {
    if (state === "error") return "bad";
    if (state === "found") return "ok";
    return "neutral";
  }

</script>

<div class="overview-summary-grid">
  <Card.Root class="hero-card">
    <Card.Header class="hero-header">
      <div class="hero-identity">
        <div class="token-icon">
          {#if hero.iconSrc}
            <img src={hero.iconSrc} alt="" />
          {:else}
            <ShieldCheck size={24} strokeWidth={2.1} />
          {/if}
        </div>
        <div class="hero-copy">
          <Card.Title class="hero-title"><h2>{hero.title}</h2></Card.Title>
          <div class="hero-meta">
            <div class="badges cluster">
              {#if hero.versionBadge}
                <StatusBadge label={hero.versionBadge} tone="neutral" />
              {/if}
              <StatusBadge label={hero.mdsStateLabel} tone={mdsTone(hero.mdsState)} />
            </div>
            <Card.Description class="hero-subtitle">{hero.subtitle}</Card.Description>
          </div>
        </div>
      </div>
    </Card.Header>

    <Card.Content class="hero-content">
      <div class="hero-description flow">
        <h3>{m.overview_hero_title()}</h3>
      </div>

      <div class="signal-grid switcher">
        {#each signalGroups as group (group.id)}
          <OverviewSignalGroup {group} />
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <OverviewMetadataPanel {hero} loading={mdsLoading} onRefresh={onRefreshMDS} />
</div>

<style>
@layer blocks {
    .overview-summary-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
      min-width: 0;
    }

    :global(.hero-card) {
      min-width: 0;
    }

    :global(.hero-header) {
      gap: var(--space-4);
      min-width: 0;
    }

    .hero-identity {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
    }

    .token-icon {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--muted);
      color: var(--muted-foreground);
    }

    .token-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: var(--space-2);
    }

    .hero-copy {
      display: grid;
      align-content: center;
      gap: var(--space-1);
      min-width: 0;
      min-height: 64px;
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      column-gap: var(--space-3);
      row-gap: var(--space-1);
      align-items: baseline;
      min-width: 0;
    }

    .hero-meta .badges {
      flex: 0 0 auto;
      --cluster-align: baseline;
      --cluster-space: var(--space-1);
    }

    h3 {
      margin: 0;
    }

    :global(.hero-title) {
      overflow: hidden;
      color: var(--foreground);
      font-size: 1.35rem;
      line-height: 1.1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :global(.hero-title h2) {
      margin: 0;
      font: inherit;
    }

    :global(.hero-subtitle) {
      min-width: 12rem;
      overflow: hidden;
      flex: 1 1 16rem;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    h2 {
      max-width: 50rem;
      font-size: 1.25rem;
    }

    .hero-description {
      --flow-space: var(--space-2);
    }

    .signal-grid {
      --switcher-space: var(--space-4);
      --switcher-threshold: 42rem;
    }

    :global(.hero-content) {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    @container workspace (min-width: 64rem) {
      .overview-summary-grid {
        grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
      }
    }

    @container workspace (max-width: 45rem) {
      :global(.hero-header) {
        display: grid;
      }

      .hero-meta {
        display: grid;
      }

      :global(.hero-subtitle) {
        min-width: 0;
      }
    }
}
</style>
