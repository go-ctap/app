<script lang="ts">
  import { ChevronRight } from "@lucide/svelte";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { recordID } from "$lib/features/logs/state.svelte.js";
  import type { OperationLogGroup } from "$lib/log-grouping.js";
  import {
    logLevel,
    logLevelLabel,
    logOutcome,
    logOutcomeLabel,
    logSummary,
    logTime,
    operationKindLabel,
  } from "$lib/log-presentation.js";
  import { LogLevel } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    group: OperationLogGroup;
    selectedId: string | null;
    open: boolean;
    onSelect: (id: string) => void;
    onOpen?: (id: string) => void;
    onToggle: () => void;
  };

  let { group, selectedId, open, onSelect, onOpen = onSelect, onToggle }: Props = $props();

  let title = $derived.by(() => {
    if (group.operation) return logSummary(group.operation);
    const kind = group.allRecords.find((record) => record.entry.operationKind)?.entry.operationKind;
    return kind
      ? m.logs_summary_operation_run({ operation: operationKindLabel(kind) })
      : m.operation_running();
  });
  let groupSelected = $derived(group.allRecords.some((record) => recordID(record) === selectedId));
  let representativeSelected = $derived(recordID(group.representative) === selectedId);

  function handleRecordClick() {
    onOpen(recordID(group.representative));
  }
</script>

<div
  class="log-operation-group"
  data-log-operation-group
  data-group-selected={groupSelected ? "true" : undefined}
  data-open={open ? "true" : undefined}
>
  <div class="log-operation-header" data-open={open ? "true" : undefined}>
    <button
      type="button"
      class="log-operation-record"
      data-log-record-id={recordID(group.representative)}
      data-log-operation-record
      data-selected={representativeSelected ? "true" : undefined}
      aria-label={title}
      aria-pressed={representativeSelected}
      onclick={handleRecordClick}
    >
      <span class="log-operation-primary">
        <span class="log-operation-gutter" aria-hidden="true"></span>
        <time datetime={group.representative.entry.timestamp}>{logTime(group.representative)}</time>
        <span title={title}>{title}</span>
      </span>
      <span class="log-operation-badges">
        <Badge variant={logLevel(group.representative) === LogLevel.LogLevelError ? "destructive" : logLevel(group.representative) === LogLevel.LogLevelWarning ? "warning" : "outline"}>
          {logLevelLabel(logLevel(group.representative))}
        </Badge>
        <Badge variant="secondary" data-log-layer>{m.logs_layer_operation()}</Badge>
        <Badge variant="outline">{logOutcomeLabel(logOutcome(group.representative))}</Badge>
      </span>
    </button>

    <button
      type="button"
      class="log-operation-toggle"
      data-log-operation-toggle
      aria-expanded={open}
      aria-label={open
        ? m.logs_collapse_operation_events({ operation: title })
        : m.logs_expand_operation_events({ operation: title })}
      onclick={onToggle}
    >
      <ChevronRight aria-hidden="true" />
    </button>

    {#if open}
      <span class="log-operation-header-thread" aria-hidden="true"></span>
    {/if}
  </div>
</div>

<style>
  @layer blocks {
    .log-operation-group,
    .log-operation-header {
      display: grid;
    }

    .log-operation-group {
      --log-tree-center: calc(var(--space-2) + 0.75rem);
      --log-timeline-color: color-mix(in srgb, var(--muted-foreground) 68%, var(--border));
      --log-parent-surface: color-mix(in srgb, var(--muted) 32%, var(--background));
    }

    .log-operation-header {
      position: relative;
      min-width: 0;
    }

    .log-operation-record,
    .log-operation-toggle {
      appearance: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      color: inherit;
      font: inherit;
      outline: 0;
      box-shadow: none;
      cursor: pointer;
    }

    .log-operation-record {
      display: grid;
      justify-items: stretch;
      gap: var(--space-2);
      width: 100%;
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      background: transparent;
      text-align: left;
    }

    .log-operation-record:hover {
      background: var(--log-row-hover-surface, var(--muted));
    }

    .log-operation-record:focus-visible {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    .log-operation-toggle {
      position: absolute;
      top: var(--space-2);
      left: calc(var(--log-tree-center) - 0.75rem);
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      border: 1px solid var(--border);
      background: var(--secondary);
    }

    .log-operation-toggle:hover {
      border-color: var(
        --log-toggle-hover-border,
        color-mix(in srgb, var(--muted-foreground) 55%, var(--border))
      );
    }

    .log-operation-toggle:focus-visible {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    .log-operation-toggle :global(svg) {
      width: 1rem;
      height: 1rem;
      color: var(--muted-foreground);
      transition: transform 120ms ease;
    }

    .log-operation-primary,
    .log-operation-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    .log-operation-primary {
      display: grid;
      grid-template-columns: 1rem 5.7rem minmax(0, 1fr);
      column-gap: var(--space-3);
      min-width: 0;
    }

    .log-operation-gutter {
      min-width: 0;
    }

    .log-operation-primary time {
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      font-size: 0.68rem;
    }

    .log-operation-primary span {
      min-width: 0;
      overflow: hidden;
      font-size: 0.75rem;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-operation-badges {
      padding-left: calc(1rem + var(--space-3) + 5.7rem + var(--space-3));
    }

    .log-operation-badges :global([data-log-layer]) {
      border-color: var(--border);
    }

    .log-operation-header-thread {
      position: absolute;
      display: block;
      pointer-events: none;
    }

    .log-operation-header-thread {
      left: calc(var(--log-tree-center) - 0.5px);
      width: 1px;
      background: var(--log-timeline-color);
    }

    .log-operation-header-thread {
      top: calc(var(--space-2) + 1.5rem - 1px);
      bottom: 0;
    }
  }

  @layer exceptions {
    .log-operation-group:not([data-open="true"]) {
      border-bottom: 1px solid var(--border);
    }

    .log-operation-header[data-open="true"] {
      background: var(--log-parent-surface);
    }

    .log-operation-toggle[aria-expanded="true"] :global(svg) {
      transform: rotate(90deg);
    }

    .log-operation-record[data-selected="true"] {
      background: var(--accent);
      color: var(--accent-foreground);
    }

  }
</style>
