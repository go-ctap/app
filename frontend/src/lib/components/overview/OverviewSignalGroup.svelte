<script module lang="ts">
  import { FingerprintPattern, Info, KeyRound, ShieldCheck } from "@lucide/svelte";

  const ICONS: Record<string, typeof ShieldCheck> = {
    authentication: FingerprintPattern,
    "credentials-management": KeyRound,
  };
</script>

<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { OverviewHeroSignalGroup, OverviewRowStatus } from "$lib/overview-rules";

  let { group }: { group: OverviewHeroSignalGroup } = $props();

  let Icon = $derived(ICONS[group.id] || Info);

  function signalVariant(status: OverviewRowStatus): BadgeVariant {
    if (status === "supported" || status === "configured" || status === "enabled") return "default";
    if (status === "warning" || status === "not configured" || status === "disabled") return "secondary";
    return "outline";
  }
</script>

<section class="signal-group">
  <header>
    <Icon size={16} strokeWidth={2.1} />
    <h3>{group.title}</h3>
  </header>

  <Tooltip.Provider delayDuration={350} skipDelayDuration={80}>
    <div class="signals">
      {#each group.signals as signal (signal.id)}
        <article class="signal-row">
          <div class="signal-copy">
            <div class="signal-title">
              <span>{signal.title}</span>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Button {...props} variant="ghost" size="icon-xs" type="button" aria-label={signal.tooltip}>
                      <Info data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top" sideOffset={6}>
                  {signal.tooltip}
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <code>
              <span>{signal.flag}</span>
              <strong>{signal.value}</strong>
              {#if signal.valueNote}
                <span>{signal.valueNote}</span>
              {/if}
            </code>
          </div>
          <Badge variant={signalVariant(signal.status)}>{signal.statusLabel}</Badge>
        </article>
      {/each}
    </div>
  </Tooltip.Provider>
</section>

<style>
@layer blocks {
    .signal-group {
      display: grid;
      align-content: start;
      min-width: 0;
    }

    header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      border-bottom: 1px solid var(--border);
      padding-bottom: var(--space-2);
      color: var(--muted-foreground);
    }

    h3 {
      min-width: 0;
      overflow: hidden;
      margin: 0;
      color: var(--foreground);
      font-size: 0.9rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .signals {
      display: grid;
      min-width: 0;
    }

    .signal-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-3);
      min-width: 0;
      border-top: 1px solid var(--border);
      padding: var(--space-3) 0;
    }

    .signal-row:first-child {
      border-top: 0;
    }

    .signal-copy {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .signal-title {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-width: 0;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .signal-title span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    code {
      display: inline-flex;
      width: fit-content;
      max-width: 100%;
      gap: var(--space-1);
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--muted);
      color: var(--muted-foreground);
      padding: 2px 6px;
      font-size: 0.72rem;
    }

    code span,
    code strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    code strong {
      color: var(--foreground);
    }

    @container workspace (max-width: 32.5rem) {
      .signal-row {
        grid-template-columns: 1fr;
      }
    }
}
</style>
