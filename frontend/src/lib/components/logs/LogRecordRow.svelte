<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { LogRecord } from "$lib/features/logs/state.svelte.js";
  import { recordID } from "$lib/features/logs/state.svelte.js";
  import {
    isDryRunLog,
    logLayer,
    logLayerLabel,
    logLevel,
    logLevelLabel,
    logOutcome,
    logOutcomeLabel,
    logSummary,
    logTime,
  } from "$lib/log-presentation.js";
  import { LogLevel } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    record: LogRecord;
    selected: boolean;
    nested?: boolean;
    onSelect: (id: string) => void;
    onOpen?: (id: string) => void;
  };

  let { record, selected, nested = false, onSelect, onOpen = onSelect }: Props = $props();

  function handleClick() {
    onOpen(recordID(record));
  }
</script>

<button
  type="button"
  class="log-record-row"
  data-log-record-id={recordID(record)}
  data-selected={selected ? "true" : undefined}
  data-nested={nested ? "true" : undefined}
  aria-pressed={selected}
  onclick={handleClick}
>
  <span class="log-record-primary">
    <span class="log-record-gutter" aria-hidden="true"></span>
    <time datetime={record.source === "kit" ? record.entry.timestamp : record.timestamp}>{logTime(record)}</time>
    <span title={logSummary(record)}>{logSummary(record)}</span>
  </span>
  <span class="log-record-badges">
    <Badge variant={logLevel(record) === LogLevel.LogLevelError ? "destructive" : logLevel(record) === LogLevel.LogLevelWarning ? "warning" : "outline"}>
      {logLevelLabel(logLevel(record))}
    </Badge>
    <Badge variant="secondary" data-log-layer>{logLayerLabel(logLayer(record))}</Badge>
    {#if isDryRunLog(record)}
      <Badge variant="outline">{m.logs_dry_run()}</Badge>
    {/if}
    <Badge variant="outline">{logOutcomeLabel(logOutcome(record))}</Badge>
  </span>
</button>

<style>
  @layer blocks {
    .log-record-row {
      appearance: none;
      display: grid;
      justify-items: stretch;
      gap: var(--space-2);
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: var(--space-2) var(--space-3);
      border: 0;
      border-bottom: 1px solid var(--border);
      border-radius: 0;
      background-color: transparent;
      background-clip: padding-box;
      color: inherit;
      font: inherit;
      text-align: left;
      outline: 0;
      box-shadow: none;
      cursor: pointer;
    }

    .log-record-row:hover {
      background-color: var(--log-row-hover-surface, var(--muted));
    }

    .log-record-row:focus-visible {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    .log-record-primary,
    .log-record-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    .log-record-primary {
      display: grid;
      grid-template-columns: 1rem 5.7rem minmax(0, 1fr);
      column-gap: var(--space-3);
      min-width: 0;
    }

    .log-record-gutter {
      min-width: 0;
    }

    .log-record-primary time {
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      font-size: 0.68rem;
    }

    .log-record-primary span {
      min-width: 0;
      overflow: hidden;
      font-size: 0.75rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-record-badges {
      padding-left: calc(1rem + var(--space-3) + 5.7rem + var(--space-3));
    }

    .log-record-badges :global([data-log-layer]) {
      border-color: var(--border);
    }
  }

  @layer exceptions {
    .log-record-row[data-selected="true"] {
      background-color: var(--accent);
      color: var(--accent-foreground);
    }

    .log-record-row[data-nested="true"] {
      position: relative;
      border-bottom: 0;
    }

    .log-record-row[data-nested="true"]:hover {
      background-color: var(--log-row-hover-surface, var(--muted));
    }

    .log-record-row[data-nested="true"][data-selected="true"] {
      background-color: var(--accent);
    }
  }
</style>
