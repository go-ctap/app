<script module lang="ts">
  import { ShieldCheck } from "@lucide/svelte";
</script>

<script lang="ts">
  import type { OverviewHeroModel, OverviewHeroSignalGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";
  import OverviewMetadataPanel from "./OverviewMetadataPanel.svelte";
  import OverviewSignalGroup from "./OverviewSignalGroup.svelte";

  let {
    hero,
    signalGroups = [],
    sessionState = "idle",
    sessionLabel = "",
    loading = false,
    mdsLoading = false,
    reloadDisabled = false,
    onReload = () => {},
    onRefreshMDS = () => {},
  }: {
    hero: OverviewHeroModel;
    signalGroups?: OverviewHeroSignalGroup[];
    sessionState?: string;
    sessionLabel?: string;
    loading?: boolean;
    mdsLoading?: boolean;
    reloadDisabled?: boolean;
    onReload?: () => void | Promise<void>;
    onRefreshMDS?: () => void | Promise<void>;
  } = $props();

  function mdsTone(state: OverviewHeroModel["mdsState"]) {
    if (state === "error") return "bad";
    if (state === "found") return "ok";
    return "neutral";
  }
</script>

<section class="hero-panel workbench-panel sidebar-layout" data-padding="none" data-overflow="hidden">
  <div class="hero-main">
    <header class="hero-header">
      <div class="hero-identity">
        <div class="token-icon">
          {#if hero.iconSrc}
            <img src={hero.iconSrc} alt="" />
          {:else}
            <ShieldCheck size={24} strokeWidth={2.1} />
          {/if}
        </div>
        <div class="hero-copy">
          <div class="badges cluster">
            <StatusBadge value={sessionState} label={sessionLabel} />
            <StatusBadge value={hero.mdsState} label={hero.mdsStateLabel} tone={mdsTone(hero.mdsState)} />
          </div>
          <h1>{hero.title}</h1>
          <p>{hero.subtitle}</p>
        </div>
      </div>

      <button type="button" onclick={onReload} disabled={reloadDisabled}>
        {loading ? m.reloading() : m.reload_overview()}
      </button>
    </header>

    <div class="hero-description flow">
      <p class="eyebrow">{m.overview_hero_heading()}</p>
      <h2>{m.overview_hero_title()}</h2>
      <p>{m.overview_hero_description()}</p>
    </div>

    <div class="signal-grid switcher">
      {#each signalGroups as group (group.id)}
        <OverviewSignalGroup {group} />
      {/each}
    </div>
  </div>

  <OverviewMetadataPanel {hero} loading={mdsLoading} onRefresh={onRefreshMDS} />
</section>

<style>
  .hero-panel {
    box-shadow: var(--shadow-hairline);
  }

  .hero-main {
    display: grid;
    gap: var(--space-5);
    min-width: 0;
    padding: var(--space-5);
  }

  .hero-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    min-width: 0;
  }

  .hero-identity {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: var(--space-3);
    min-width: 0;
  }

  .token-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel-soft);
    color: var(--color-text-muted);
  }

  .token-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: var(--space-2);
  }

  .hero-copy {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    overflow: hidden;
    color: var(--color-text);
    font-size: 1.35rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  h2 {
    max-width: 50rem;
    font-size: 1.25rem;
  }

  p {
    color: var(--color-text-muted);
    line-height: 1.55;
  }

  .eyebrow {
    color: var(--color-text-soft);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .hero-description {
    --flow-space: var(--space-2);
  }

  .signal-grid {
    --switcher-space: var(--space-4);
    --switcher-threshold: 42rem;
  }

  @media (min-width: 1020px) {
    .hero-panel {
      --sidebar-width: 24rem;
    }
  }

  @media (max-width: 720px) {
    .hero-header {
      display: grid;
    }
  }
</style>
