<script module lang="ts">
  import { ShieldCheck } from "@lucide/svelte";
</script>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
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

<Card.Root class="grid min-w-0 overflow-hidden py-0 min-[1020px]:grid-cols-[minmax(0,1fr)_24rem]">
  <Card.Content class="grid min-w-0 gap-5 p-5">
    <header class="hero-header">
      <div class="hero-identity">
        <div class="token-icon">
          {#if hero.iconSrc}
            <img src={hero.iconSrc} width="48" height="48" alt="" />
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

      <Button variant="outline" type="button" onclick={onReload} disabled={reloadDisabled}>
        {loading ? m.reloading() : m.reload_overview()}
      </Button>
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
  </Card.Content>

  <OverviewMetadataPanel {hero} loading={mdsLoading} onRefresh={onRefreshMDS} />
</Card.Root>

<style>
@layer blocks {
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
      color: var(--foreground);
      font-size: 1.35rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    h2 {
      max-width: 50rem;
      font-size: 1.25rem;
    }

    p {
      color: var(--muted-foreground);
      line-height: 1.55;
    }

    .eyebrow {
      color: var(--muted-foreground);
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

    @media (max-width: 720px) {
      .hero-header {
        display: grid;
      }
    }
}
</style>
