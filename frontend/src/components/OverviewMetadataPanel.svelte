<script module lang="ts">
  import { Copy, ExternalLink, RefreshCw } from "@lucide/svelte";
</script>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
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

  function factToneClass(fact: OverviewHeroFact) {
    if (fact.placeholder || fact.tone === "muted") return "text-muted-foreground";
    if (fact.tone === "success") return "text-emerald-700 dark:text-emerald-400";
    if (fact.tone === "warning") return "text-amber-700 dark:text-amber-400";
    if (fact.tone === "error") return "text-destructive";
    return "text-foreground";
  }
</script>

{#snippet factRow(fact: OverviewHeroFact)}
  <div class="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 border-t py-2 first:border-t-0">
    <dt class="text-xs text-muted-foreground">{fact.label}</dt>
    <dd class={`m-0 min-w-0 truncate text-right text-xs font-medium ${factToneClass(fact)}`}>
      {#if fact.href && !fact.placeholder}
        <a class="inline-flex max-w-full items-center justify-end gap-1 truncate underline-offset-4 hover:underline" href={fact.href} target="_blank" rel="noreferrer" title={fact.href}>
          <span class="truncate">{fact.value}</span>
          <ExternalLink size={11} class="shrink-0" />
        </a>
      {:else}
        {fact.value}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet factSection(title: string, facts: OverviewHeroFact[])}
  <section class="grid min-w-0 gap-1 border-t pt-3">
    <h3 class="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
    <dl class="grid min-w-0">
      {#each facts as fact (fact.label)}
        {@render factRow(fact)}
      {/each}
    </dl>
  </section>
{/snippet}

<aside class="grid h-full min-w-0 content-start gap-3 p-4 lg:p-5" aria-label={m.metadata_service()}>
  <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
    <div class="grid min-w-0 gap-1">
      <h2 class="truncate text-sm font-semibold">{m.metadata_service()}</h2>
      <p class="line-clamp-2 text-xs leading-5 text-muted-foreground">{hero.mdsDescription}</p>
    </div>
    <Button variant="outline" size="sm" type="button" onclick={onRefresh} disabled={loading || !hero.aaguidAvailable}>
      <RefreshCw size={14} class={loading ? "animate-spin" : ""} />
      {loading ? m.mds_refreshing() : m.mds_refresh()}
    </Button>
  </div>

  <div class="grid min-w-0 gap-1 border-t pt-3">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <span class="text-xs text-muted-foreground">{m.mds_aaguid()}</span>
      {#if hero.aaguidAvailable}
        <Button variant="ghost" size="icon-xs" type="button" onclick={copyAaguid} aria-label={m.copy_label({ label: "AAGUID" })}>
          <Copy size={12} />
        </Button>
      {/if}
    </div>
    <code class="block min-w-0 truncate font-mono text-xs font-medium text-foreground" title={hero.aaguid}>{hero.aaguid}</code>
  </div>

  {@render factSection(m.mds_latest_status_report(), hero.mdsStatusFacts)}
  {@render factSection(m.mds_metadata_blob(), hero.mdsBlobFacts)}
</aside>
