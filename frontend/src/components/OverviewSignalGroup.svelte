<script module lang="ts">
  import { FingerprintPattern, Info, KeyRound, ShieldCheck } from "@lucide/svelte";

  const ICONS: Record<string, typeof ShieldCheck> = {
    authentication: FingerprintPattern,
    "credentials-management": KeyRound,
  };
</script>

<script lang="ts">
  import type { OverviewHeroSignal, OverviewHeroSignalGroup } from "$lib/overview-rules";

  let { group }: { group: OverviewHeroSignalGroup } = $props();

  let Icon = $derived(ICONS[group.id] || Info);

  function signalTone(status: OverviewHeroSignal["status"]) {
    if (status === "supported" || status === "configured" || status === "enabled") return "ok";
    if (status === "warning" || status === "not configured" || status === "disabled") return "warn";
    if (status === "informational") return "info";
    return "muted";
  }
</script>

<section class="signal-group">
  <header>
    <Icon size={16} strokeWidth={2.1} />
    <h3>{group.title}</h3>
  </header>

  <div class="signals">
    {#each group.signals as signal (signal.id)}
      {@const tone = signalTone(signal.status)}
      <article class="signal-row" title={signal.tooltip}>
        <div class="signal-copy">
          <div class="signal-title">
            <span>{signal.title}</span>
            <Info size={12} aria-label={signal.tooltip} />
          </div>
          <code title={`${signal.flag} ${signal.value}${signal.valueNote ? ` (${signal.valueNote})` : ""}`}>
            <span>{signal.flag}</span>
            <strong>{signal.value}</strong>
            {#if signal.valueNote}
              <span>{signal.valueNote}</span>
            {/if}
          </code>
        </div>
        <div class="signal-status" data-tone={tone}>
          <span aria-hidden="true"></span>
          <strong>{signal.statusLabel}</strong>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .signal-group {
    display: grid;
    align-content: start;
    min-width: 0;
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-2);
    color: var(--color-text-muted);
  }

  h3 {
    min-width: 0;
    overflow: hidden;
    margin: 0;
    color: var(--color-text);
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
    border-top: 1px solid var(--color-border);
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
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-panel-soft);
    color: var(--color-text-muted);
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
    color: var(--color-text);
  }

  .signal-status {
    display: inline-flex;
    align-items: center;
    align-self: start;
    gap: 6px;
    padding-top: 2px;
    font-size: 0.75rem;
  }

  .signal-status span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }

  .signal-status[data-tone="ok"] {
    color: var(--color-success);
  }

  .signal-status[data-tone="warn"] {
    color: var(--color-warning);
  }

  .signal-status[data-tone="info"] {
    color: var(--color-info);
  }

  .signal-status[data-tone="muted"] {
    color: var(--color-text-muted);
  }

  @media (max-width: 520px) {
    .signal-row {
      grid-template-columns: 1fr;
    }
  }
</style>
