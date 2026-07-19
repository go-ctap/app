<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { LogRecord } from "$lib/features/logs/state.svelte.js";
  import { recordID } from "$lib/features/logs/state.svelte.js";
  import {
    logOutcome,
    logOutcomeLabel,
    logSummary,
    logTime,
  } from "$lib/log-presentation.js";
  import { LogOutcome } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    record: LogRecord;
    selected: boolean;
    onSelect: (id: string) => void;
    onOpen?: (id: string) => void;
  };

  let { record, selected, onSelect, onOpen = onSelect }: Props = $props();
  let outcome = $derived(logOutcome(record));

  function handleClick() {
    onOpen(recordID(record));
  }
</script>

<button
  type="button"
  class="log-record-row"
  data-log-record-id={recordID(record)}
  data-selected={selected ? "true" : undefined}
  aria-label={logSummary(record)}
  aria-pressed={selected}
  onclick={handleClick}
>
  <span class="log-record-primary">
    <span class="log-record-gutter" aria-hidden="true"></span>
    <time datetime={record.source === "kit" ? record.entry.timestamp : record.timestamp}>{logTime(record)}</time>
    <span title={logSummary(record)}>{logSummary(record)}</span>
  </span>
  <span class="log-record-badges">
    <Badge variant="secondary" data-log-source>
      {record.source === "kit" ? m.logs_source_kit() : m.logs_source_runtime()}
    </Badge>
    <Badge
      variant={outcome === LogOutcome.LogOutcomeFailed
        ? "destructive"
        : outcome === LogOutcome.LogOutcomeCanceled
          ? "warning"
          : "outline"}
    >
      {logOutcomeLabel(outcome)}
    </Badge>
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

    .log-record-badges :global([data-log-source]) {
      border-color: var(--border);
    }
  }

  @layer exceptions {
    .log-record-row[data-selected="true"] {
      background-color: var(--accent);
      color: var(--accent-foreground);
    }
  }
</style>
