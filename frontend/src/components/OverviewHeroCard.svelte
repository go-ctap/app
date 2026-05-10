<script module lang="ts">
  import { ShieldCheck } from "@lucide/svelte";
</script>

<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import type { OverviewHeroModel, OverviewHeroSignalGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";
  import OverviewMetadataPanel from "./OverviewMetadataPanel.svelte";
  import OverviewSignalGroup from "./OverviewSignalGroup.svelte";

  export let hero: OverviewHeroModel;
  export let signalGroups: OverviewHeroSignalGroup[] = [];
  export let sessionState = "idle";
  export let sessionLabel = "";
  export let loading = false;
  export let mdsLoading = false;
  export let reloadDisabled = false;
  export let onReload: () => void | Promise<void> = () => {};
  export let onRefreshMDS: () => void | Promise<void> = () => {};

  function mdsBadgeVariant(state: OverviewHeroModel["mdsState"]): "secondary" | "outline" | "destructive" {
    if (state === "error") return "destructive";
    if (state === "found") return "secondary";
    return "outline";
  }
</script>

<Card.Root class="overflow-hidden py-0">
  <Card.Content class="grid gap-0 p-0">
    <div class="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,23.75rem)]">
      <div class="grid min-w-0 gap-5 p-4 lg:p-5">
        <div class="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
              {#if hero.iconSrc}
                <img src={hero.iconSrc} alt="" class="size-full object-contain p-2" />
              {:else}
                <ShieldCheck size={23} strokeWidth={2.1} />
              {/if}
            </div>
            <div class="grid min-w-0 gap-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <StatusBadge value={sessionState} label={sessionLabel} />
                <Badge variant={mdsBadgeVariant(hero.mdsState)}>{hero.mdsStateLabel}</Badge>
              </div>
              <h1 class="truncate text-xl font-semibold tracking-normal md:text-2xl">{hero.title}</h1>
              <p class="line-clamp-2 max-w-3xl text-sm text-muted-foreground">{hero.subtitle}</p>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
            <Button variant="outline" size="sm" onclick={onReload} disabled={reloadDisabled}>
              {loading ? m.reloading() : m.reload_overview()}
            </Button>
          </div>
        </div>

        <div class="grid min-w-0 gap-4">
          <div class="grid min-w-0 content-start gap-2">
            <p class="text-xs font-medium uppercase text-muted-foreground">{m.overview_hero_heading()}</p>
            <h2 class="text-balance text-2xl font-semibold leading-8 tracking-normal">{m.overview_hero_title()}</h2>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground">{m.overview_hero_description()}</p>
          </div>

          <div class="grid min-w-0 gap-5 lg:grid-cols-2">
            {#each signalGroups as group (group.id)}
              <OverviewSignalGroup {group} />
            {/each}
          </div>
        </div>
      </div>

      <OverviewMetadataPanel {hero} loading={mdsLoading} onRefresh={onRefreshMDS} />
    </div>
  </Card.Content>
</Card.Root>
