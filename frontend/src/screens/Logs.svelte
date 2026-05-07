<script lang="ts">
  import { afterUpdate } from "svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import { activeScreen, focusLogEntry, selectedLogEntryId, workbenchLog, type WorkbenchLogEntry } from "../lib/stores";
  import { operationStageLabel } from "../lib/format";

  type LogFilter = "all" | "operations" | "errors";

  let filter: LogFilter = "all";
  let lastScrolled = "";

  const filters: { id: LogFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "operations", label: "Operations" },
    { id: "errors", label: "Errors" },
  ];

  $: entries = $workbenchLog.filter((entry) => {
    if (filter === "operations") return entry.source.includes("operation") || Boolean(entry.operationId);
    if (filter === "errors") return entry.tone === "error";
    return true;
  });
  $: selected = entries.find((entry) => entry.id === $selectedLogEntryId) || entries[0] || null;
  $: detailData = selected ? selected.data || selected : null;
  $: emptyTitleText = filter === "errors" ? "No error events" : filter === "operations" ? "No operation events" : "No events yet";
  $: emptyMessageText =
    filter === "errors"
      ? "Errors and failed operations will appear here when they happen."
      : filter === "operations"
        ? "Run an authenticator operation to populate the operation journal."
        : "Recent session changes, operation progress, and recoverable errors will appear here.";

  afterUpdate(() => {
    if ($activeScreen !== "logs" || !selected?.id || selected.id === lastScrolled) return;
    document.getElementById(`log-entry-${selected.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    lastScrolled = selected.id;
  });

  function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function sourceLabel(entry: WorkbenchLogEntry) {
    if (entry.source.startsWith("operation") || entry.operationId) return "Operation";
    return entry.source.replaceAll("-", " ");
  }

  function sameLabel(left: string | undefined, right: string | undefined) {
    return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
  }

  function secondaryMessage(entry: WorkbenchLogEntry) {
    const stage = operationStageLabel(entry.stage);
    if (!entry.message || sameLabel(entry.message, entry.title) || sameLabel(entry.message, stage)) return "";
    return entry.message;
  }

  function metaLabel(entry: WorkbenchLogEntry) {
    const parts = [sourceLabel(entry)];
    const stage = operationStageLabel(entry.stage);
    if (entry.stage && !sameLabel(stage, entry.title) && !sameLabel(stage, entry.message)) {
      parts.push(stage);
    } else if (entry.operationId) {
      parts.push(entry.operationId);
    }
    return parts.join(" · ");
  }

</script>

<section class="screen-band logs-header">
  <div>
    <div class="eyebrow">Session journal</div>
    <h1>Logs</h1>
    <p class="lede">Recent operation events, recoverable errors, and session changes for this app session.</p>
  </div>
  <div class="log-filter-tabs" aria-label="Log filters">
    {#each filters as item}
      <button type="button" class:active={filter === item.id} on:click={() => (filter = item.id)}>{item.label}</button>
    {/each}
  </div>
</section>

{#if entries.length}
  <section class="logs-workspace">
    <div class="log-list" aria-label="Workbench log entries">
      {#each entries as entry}
        <button
          id={`log-entry-${entry.id}`}
          type="button"
          class="log-entry {entry.tone}"
          class:active={selected?.id === entry.id}
          on:click={() => focusLogEntry(entry.id)}
        >
          <span class="log-entry-time">{formatTime(entry.timestamp)}</span>
          <span class="log-entry-main">
            <strong>{entry.title}</strong>
            {#if secondaryMessage(entry)}
              <span>{secondaryMessage(entry)}</span>
            {/if}
          </span>
          <span class="log-entry-meta">{metaLabel(entry)}</span>
        </button>
      {/each}
    </div>

    <aside class="log-detail" aria-label="Selected log entry">
      {#if selected}
        <div class="log-detail-heading">
          <div>
            <span class="log-tone {selected.tone}">{selected.tone}</span>
            <h2>{selected.title}</h2>
          </div>
          <time datetime={selected.timestamp}>{formatTime(selected.timestamp)}</time>
        </div>

        <dl class="log-meta-grid">
          <div>
            <dt>Source</dt>
            <dd>{sourceLabel(selected)}</dd>
          </div>
          {#if selected.operationId}
            <div>
              <dt>Operation</dt>
              <dd><code>{selected.operationId}</code></dd>
            </div>
          {/if}
          {#if selected.stage}
            <div>
              <dt>Stage</dt>
              <dd>{operationStageLabel(selected.stage)}</dd>
            </div>
          {/if}
          {#if selected.screen}
            <div>
              <dt>Screen</dt>
              <dd>{selected.screen}</dd>
            </div>
          {/if}
          {#if selected.selector}
            <div>
              <dt>Selector</dt>
              <dd><code>{selected.selector}</code></dd>
            </div>
          {/if}
        </dl>

        {#if selected.message}
          <p class="log-detail-message">{selected.message}</p>
        {/if}

        <JsonView title="Sanitized JSON" value={detailData} variant="bare" />
      {/if}
    </aside>
  </section>
{:else}
  <div class="logs-empty">
    <EmptyState eyebrow="Logs" title={emptyTitleText} message={emptyMessageText} variant="workspace" />
  </div>
{/if}
