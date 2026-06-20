<script module lang="ts">
  import { Copy, ExternalLink, RefreshCw } from "@lucide/svelte";
</script>

<script lang="ts">
  import type { OverviewHeroFact, OverviewHeroModel } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let {
    hero,
    loading = false,
    onRefresh = () => {},
  }: {
    hero: OverviewHeroModel;
    loading?: boolean;
    onRefresh?: () => void | Promise<void>;
  } = $props();

  async function copyAaguid() {
    if (hero.aaguidAvailable) {
      await navigator.clipboard?.writeText(hero.aaguid);
    }
  }

  function factTone(fact: OverviewHeroFact) {
    if (fact.placeholder || fact.tone === "muted") return "muted";
    if (fact.tone === "success") return "success";
    if (fact.tone === "warning") return "warning";
    if (fact.tone === "error") return "error";
    return "";
  }
</script>

{#snippet factRow(fact: OverviewHeroFact)}
  <div class="fact-row">
    <dt>{fact.label}</dt>
    <dd data-tone={factTone(fact)}>
      {#if fact.href && !fact.placeholder}
        <a href={fact.href} target="_blank" rel="noreferrer" title={fact.href}>
          <span>{fact.value}</span>
          <ExternalLink size={11} />
        </a>
      {:else}
        {fact.value}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet factSection(title: string, facts: OverviewHeroFact[])}
  <section class="fact-section">
    <h3>{title}</h3>
    <dl>
      {#each facts as fact (fact.label)}
        {@render factRow(fact)}
      {/each}
    </dl>
  </section>
{/snippet}

<aside class="metadata-panel" aria-label={m.metadata_service()}>
  <header>
    <div>
      <h2>{m.metadata_service()}</h2>
      <p>{hero.mdsDescription}</p>
    </div>
    <button type="button" onclick={onRefresh} disabled={loading || !hero.aaguidAvailable}>
      <RefreshCw size={14} class={loading ? "u-spin" : undefined} />
      {loading ? m.mds_refreshing() : m.mds_refresh()}
    </button>
  </header>

  <section class="aaguid-section">
    <div class="aaguid-header cluster">
      <span>{m.mds_aaguid()}</span>
      {#if hero.aaguidAvailable}
        <button class="tiny-button" type="button" onclick={copyAaguid} aria-label={m.copy_label({ label: "AAGUID" })}>
          <Copy size={12} />
        </button>
      {/if}
    </div>
    <code title={hero.aaguid}>{hero.aaguid}</code>
  </section>

  {@render factSection(m.mds_latest_status_report(), hero.mdsStatusFacts)}
  {@render factSection(m.mds_metadata_blob(), hero.mdsBlobFacts)}
</aside>

<style>
  .metadata-panel {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
    border-top: 1px solid var(--color-border);
    background: var(--color-panel-soft);
    padding: var(--space-5);
  }

  header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: start;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 0.95rem;
  }

  h3,
  .aaguid-header {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  p {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    line-height: 1.55;
  }

  .aaguid-section,
  .fact-section {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
  }

  .fact-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: baseline;
  }

  .aaguid-header {
    --cluster-justify: space-between;
    --cluster-space: var(--space-3);
  }

  code {
    display: block;
    min-width: 0;
    overflow: hidden;
    color: var(--color-text);
    font-size: 0.75rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dl {
    display: grid;
    margin: 0;
  }

  .fact-row {
    border-top: 1px solid var(--color-border);
    padding: var(--space-2) 0;
  }

  .fact-row:first-child {
    border-top: 0;
  }

  dt,
  dd {
    margin: 0;
    min-width: 0;
    font-size: 0.75rem;
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    overflow: hidden;
    color: var(--color-text);
    font-weight: 700;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dd a {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
  }

  dd a span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  dd[data-tone="muted"] {
    color: var(--color-text-muted);
  }

  dd[data-tone="success"] {
    color: var(--color-success);
  }

  dd[data-tone="warning"] {
    color: var(--color-warning);
  }

  dd[data-tone="error"] {
    color: var(--color-danger);
  }

  .tiny-button {
    width: 24px;
    min-height: 24px;
    padding: 0;
  }

  @media (min-width: 1020px) {
    .metadata-panel {
      border-top: 0;
      border-left: 1px solid var(--color-border);
    }
  }
</style>
