<script lang="ts">
  import {
    BadgeCheck,
    Database,
    FingerprintPattern,
    HardDrive,
    Info,
    KeyRound,
    ListChecks,
    Ruler,
    ScanFace,
    Settings2,
    ShieldCheck,
    Touchpad,
  } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type {
    OverviewHeroSignalGroup,
    OverviewHeroSignalGroupId,
    OverviewHeroSignalId,
  } from "$lib/overview-rules";

  let { group }: { group: OverviewHeroSignalGroup } = $props();
</script>

{#snippet groupIcon(id: OverviewHeroSignalGroupId)}
  {#if id === "authentication"}
    <FingerprintPattern size={16} aria-hidden="true" />
  {:else}
    <KeyRound size={16} aria-hidden="true" />
  {/if}
{/snippet}

{#snippet signalIcon(id: OverviewHeroSignalId)}
  {#if id === "up"}
    <Touchpad size={16} aria-hidden="true" />
  {:else if id === "clientPin"}
    <KeyRound size={16} aria-hidden="true" />
  {:else if id === "uv"}
    <ScanFace size={16} aria-hidden="true" />
  {:else if id === "pinUvAuthToken"}
    <ShieldCheck size={16} aria-hidden="true" />
  {:else if id === "alwaysUv"}
    <BadgeCheck size={16} aria-hidden="true" />
  {:else if id === "rk"}
    <HardDrive size={16} aria-hidden="true" />
  {:else if id === "credMgmt"}
    <ListChecks size={16} aria-hidden="true" />
  {:else if id === "largeBlobs"}
    <Database size={16} aria-hidden="true" />
  {:else if id === "authnrCfg"}
    <Settings2 size={16} aria-hidden="true" />
  {:else}
    <Ruler size={16} aria-hidden="true" />
  {/if}
{/snippet}

<section class="signal-group">
  <header>
    {@render groupIcon(group.id)}
    <h3>{group.title}</h3>
  </header>

  <Tooltip.Provider delayDuration={350} skipDelayDuration={80}>
    <dl class="signals">
      {#each group.signals as signal (signal.id)}
        <div class="signal-row" data-status={signal.status}>
          <dt>
            {@render signalIcon(signal.id)}
            <span class="signal-copy">
              <span class="signal-title">
                <strong>{signal.title}</strong>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    {#snippet child({ props })}
                      <Button
                        {...props}
                        variant="ghost"
                        size="icon-xs"
                        type="button"
                        aria-label={signal.tooltip}
                      >
                        <Info data-icon="inline-start" aria-hidden="true" />
                      </Button>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" sideOffset={6}>
                    {signal.tooltip}
                  </Tooltip.Content>
                </Tooltip.Root>
              </span>
              <code class="signal-source">
                <span>{signal.flag}</span>
                <span aria-hidden="true">·</span>
                <strong>{signal.value}</strong>
                {#if signal.valueNote}
                  <span>{signal.valueNote}</span>
                {/if}
              </code>
            </span>
          </dt>
          <dd>
            <span class="signal-status-dot" aria-hidden="true"></span>
            <span>{signal.statusLabel}</span>
          </dd>
        </div>
      {/each}
    </dl>
  </Tooltip.Provider>
</section>

<style>
  @layer blocks {
    .signal-group {
      --signal-positive: color-mix(in oklch, var(--primary) 45%, var(--sidebar-primary));
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      min-width: 0;
    }

    header,
    .signal-row dt,
    .signal-title,
    .signal-source {
      display: flex;
      align-items: center;
    }

    header {
      gap: var(--space-2);
      min-height: 2rem;
      padding: var(--space-4) var(--space-4) var(--space-1);
      color: var(--muted-foreground);
    }

    h3,
    .signals,
    .signal-row dd {
      margin: 0;
    }

    h3 {
      min-width: 0;
      overflow: hidden;
      color: var(--foreground);
      font-size: 0.9rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .signals {
      display: grid;
      grid-auto-rows: minmax(0, 1fr);
      min-width: 0;
    }

    .signal-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-4);
      align-items: center;
      min-width: 0;
      border-bottom: 1px solid var(--border);
      padding: var(--space-3) var(--space-4);
    }

    .signal-row:last-child {
      border-bottom: 0;
    }

    .signal-row dt {
      gap: var(--space-2);
      min-width: 0;
      color: var(--muted-foreground);
    }

    .signal-copy {
      display: grid;
      gap: 0.125rem;
      min-width: 0;
    }

    .signal-title {
      gap: var(--space-1);
      min-width: 0;
    }

    .signal-title strong {
      min-width: 0;
      overflow: hidden;
      color: var(--foreground);
      font-size: 0.8rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .signal-source {
      width: fit-content;
      max-width: 100%;
      gap: var(--space-1);
      overflow: hidden;
      color: var(--muted-foreground);
      font-size: 0.68rem;
    }

    .signal-source span,
    .signal-source strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .signal-source strong {
      color: var(--foreground);
    }

    .signal-row dd {
      display: inline-flex;
      align-items: center;
      justify-self: end;
      max-width: 20rem;
      gap: var(--space-2);
      font-weight: 700;
      text-align: end;
    }

    .signal-status-dot {
      width: 6px;
      height: 6px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: currentColor;
      box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent);
    }

    @container workspace (max-width: 30rem) {
      .signal-row {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-1);
      }

      .signal-row dd {
        justify-self: start;
        padding-inline-start: 1.5rem;
        text-align: start;
      }
    }
  }

  @layer exceptions {
    .signal-row[data-status="supported"] dd,
    .signal-row[data-status="configured"] dd,
    .signal-row[data-status="enabled"] dd {
      color: var(--signal-positive);
    }

    .signal-row[data-status="warning"] dd,
    .signal-row[data-status="not configured"] dd,
    .signal-row[data-status="disabled"] dd {
      color: var(--warning-foreground);
    }

    .signal-row[data-status="unsupported"] dd,
    .signal-row[data-status="unknown"] dd,
    .signal-row[data-status="informational"] dd {
      color: var(--muted-foreground);
    }
  }
</style>
