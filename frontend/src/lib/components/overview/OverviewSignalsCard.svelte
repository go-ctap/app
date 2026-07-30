<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import type { OverviewHeroSignalGroup } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";
  import OverviewSignalGroup from "$lib/components/overview/OverviewSignalGroup.svelte";

  let { groups = [] }: { groups?: OverviewHeroSignalGroup[] } = $props();
</script>

<Card.Root class="signals-card">
  <Card.Header>
    <Card.Title>{m.overview_hero_title()}</Card.Title>
    <Card.Description>{m.overview_signals_description()}</Card.Description>
  </Card.Header>

  <Card.Content class="signals-content">
    <div class="signal-grid">
      {#each groups as group, index (group.id)}
        {#if index > 0}
          <Separator orientation="vertical" class="signal-divider-wide" />
          <Separator class="signal-divider-narrow" />
        {/if}

        <div class="signal-panel">
          <OverviewSignalGroup {group} />
        </div>
      {/each}
    </div>
  </Card.Content>
</Card.Root>

<style>
  @layer blocks {
    :global(.signals-card) {
      height: 100%;
      min-width: 0;
      padding-block-end: 0;
    }

    :global(.signals-content) {
      display: grid;
      flex: 1;
      padding-inline: 0;
    }

    .signal-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      height: 100%;
      min-width: 0;
      border-top: 1px solid var(--border);
    }

    .signal-panel {
      display: grid;
      min-width: 0;
    }

    :global(.signal-divider-wide) {
      height: 100%;
    }

    :global(.signal-divider-narrow) {
      display: none;
    }

    @container workspace (max-width: 45rem) {
      .signal-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      :global(.signal-divider-wide) {
        display: none;
      }

      :global(.signal-divider-narrow) {
        display: block;
      }
    }
  }
</style>
