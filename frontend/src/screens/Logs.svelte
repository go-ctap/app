<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import { activeScreen, focusLogEntry, selectedLogEntryId, workbenchLog, type WorkbenchLogEntry } from "$lib/stores";
  import { operationStageLabel } from "$lib/format";

  type LogFilter = "all" | "operations" | "errors";

  let filter = $state<LogFilter>("all");
  let lastScrolled = "";

  const filters: { id: LogFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "operations", label: "Operations" },
    { id: "errors", label: "Errors" },
  ];

  let entries = $derived($workbenchLog.filter((entry) => {
    if (filter === "operations") return entry.source.includes("operation") || Boolean(entry.operationId);
    if (filter === "errors") return entry.tone === "error";
    return true;
  }));
  let selected = $derived(entries.find((entry) => entry.id === $selectedLogEntryId) || entries[0] || null);
  let detailData = $derived(selected ? selected.data || selected : null);
  let emptyTitleText = $derived(filter === "errors" ? "No error events" : filter === "operations" ? "No operation events" : "No events yet");
  let emptyMessageText = $derived(
    filter === "errors"
      ? "Errors and failed operations will appear here when they happen."
      : filter === "operations"
        ? "Run an authenticator operation to populate the operation journal."
        : "Recent session changes, operation progress, and recoverable errors will appear here."
  );

  $effect(() => {
    if ($activeScreen !== "logs" || !selected?.id || selected.id === lastScrolled) return;
    queueMicrotask(() => {
      document.getElementById(`log-entry-${selected.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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

<ScreenHeader eyebrow="Session journal" title="Logs" description="Recent operation events, recoverable errors, and session changes for this app session.">
  {#snippet actions()}
    <Tabs.Root bind:value={filter}>
      <Tabs.List aria-label="Log filters">
        {#each filters as item (item.id)}
          <Tabs.Trigger value={item.id}>{item.label}</Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>
  {/snippet}
</ScreenHeader>

{#if entries.length}
  <section class="grid gap-4 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.4fr)]">
    <Card.Root>
      <Card.Header>
        <Card.Title>Event stream</Card.Title>
        <Card.Description>{entries.length} event{entries.length === 1 ? "" : "s"}</Card.Description>
      </Card.Header>
      <Card.Content class="grid max-h-[58vh] gap-2 overflow-auto pr-1" aria-label="Workbench log entries">
        {#each entries as entry (entry.id)}
          <Button
            id={`log-entry-${entry.id}`}
            variant={selected?.id === entry.id ? "secondary" : "ghost"}
            class="h-auto justify-start whitespace-normal px-3 py-2 text-left"
            onclick={() => focusLogEntry(entry.id)}
          >
            <span class="grid w-full min-w-0 gap-1">
              <span class="flex flex-wrap items-center justify-between gap-2">
                <strong class="min-w-0 truncate text-sm">{entry.title}</strong>
                <span class="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
              </span>
              {#if secondaryMessage(entry)}
                <span class="line-clamp-2 text-sm font-normal text-muted-foreground">{secondaryMessage(entry)}</span>
              {/if}
              <span class="text-xs font-normal text-muted-foreground">{metaLabel(entry)}</span>
            </span>
          </Button>
        {/each}
      </Card.Content>
    </Card.Root>

    <Card.Root aria-label="Selected log entry">
      {#if selected}
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div class="grid gap-1">
            <Badge variant={selected.tone === "error" ? "destructive" : selected.tone === "success" ? "default" : "secondary"}>{selected.tone}</Badge>
            <Card.Title>{selected.title}</Card.Title>
          </div>
          <time class="text-sm text-muted-foreground" datetime={selected.timestamp}>{formatTime(selected.timestamp)}</time>
        </Card.Header>

        <Card.Content class="grid gap-4">
        <dl class="grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium uppercase tracking-normal text-muted-foreground">Source</dt>
            <dd class="break-words text-sm">{sourceLabel(selected)}</dd>
          </div>
          {#if selected.operationId}
            <div>
              <dt class="text-xs font-medium uppercase tracking-normal text-muted-foreground">Operation</dt>
              <dd><code>{selected.operationId}</code></dd>
            </div>
          {/if}
          {#if selected.stage}
            <div>
              <dt class="text-xs font-medium uppercase tracking-normal text-muted-foreground">Stage</dt>
              <dd class="text-sm">{operationStageLabel(selected.stage)}</dd>
            </div>
          {/if}
          {#if selected.screen}
            <div>
              <dt class="text-xs font-medium uppercase tracking-normal text-muted-foreground">Screen</dt>
              <dd class="text-sm">{selected.screen}</dd>
            </div>
          {/if}
          {#if selected.selector}
            <div>
              <dt class="text-xs font-medium uppercase tracking-normal text-muted-foreground">Selector</dt>
              <dd><code>{selected.selector}</code></dd>
            </div>
          {/if}
        </dl>

        {#if selected.message}
          <p class="rounded-md border border-border bg-muted/40 p-3 text-sm leading-6">{selected.message}</p>
        {/if}

        <JsonView title="Sanitized JSON" value={detailData} variant="bare" />
        </Card.Content>
      {/if}
    </Card.Root>
  </section>
{:else}
  <EmptyState eyebrow="Logs" title={emptyTitleText} message={emptyMessageText} variant="workspace" />
{/if}
