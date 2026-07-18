<script lang="ts">
  import { FileWarning, ShieldAlert } from "@lucide/svelte";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { failureMessage } from "$lib/failure.js";
  import type { LogRecord } from "$lib/features/logs/state.svelte.js";
  import {
    commandLabel,
    logLayer,
    logLayerLabel,
    logLevel,
    logLevelLabel,
    logOutcome,
    logOutcomeLabel,
    logSummary,
    logTime,
    operationKindLabel,
  } from "$lib/log-presentation.js";

  import { m } from "../../../paraglide/messages.js";
  import PreformattedJson from "./PreformattedJson.svelte";

  type Props = {
    record: LogRecord;
  };

  type SummaryRow = {
    label: string;
    value: string;
  };

  let { record }: Props = $props();

  let summaryRows = $derived(buildSummaryRows(record));
  let request = $derived(record.source === "kit" ? record.entry.request ?? null : null);
  let response = $derived(record.source === "kit" ? record.entry.response ?? null : null);
  let errorMessage = $derived(record.source === "kit" ? record.entry.errorMessage ?? "" : "");
  let responseJSON = $derived.by(() => {
    if (record.source === "app/runtime") return JSON.stringify(record.error, null, 2);
    if (record.entry.response) return record.entry.response.json;
    return record.entry.error ? JSON.stringify(record.entry.error, null, 2) : null;
  });
  let redactedFields = $derived(record.source === "kit" ? record.entry.redactedFields ?? [] : []);

  function buildSummaryRows(value: LogRecord): SummaryRow[] {
    if (value.source === "app/runtime") {
      return [
        { label: m.logs_source(), value: m.logs_source_runtime() },
        { label: m.logs_entry_id(), value: value.id },
        { label: m.logs_failure(), value: failureMessage(value.error) },
      ];
    }

    const entry = value.entry;
    return [
      { label: m.logs_source(), value: m.logs_source_kit() },
      { label: m.logs_sequence(), value: String(value.sequence) },
      { label: m.logs_selection_id(), value: entry.selectionId ?? "" },
      { label: m.logs_operation_id(), value: entry.operationId ?? "" },
      { label: m.logs_duration(), value: entry.durationMilliseconds === undefined ? "" : m.logs_duration_ms({ duration: entry.durationMilliseconds }) },
      { label: m.logs_operation(), value: entry.operationKind ? operationKindLabel(entry.operationKind) : "" },
      { label: m.logs_command(), value: entry.command ? commandLabel(value) : "" },
      { label: m.logs_subcommand(), value: entry.subCommand ?? "" },
      { label: m.logs_failure(), value: failureMessage(entry.error) ?? "" },
    ].filter((row) => row.value);
  }
</script>

<article class="log-detail">
  <header class="log-detail-header">
    <p class="log-detail-time">{logTime(record)}</p>
    <h2 class="log-detail-title">{logSummary(record)}</h2>
    <div class="log-detail-badges" aria-label={m.status()}>
      <Badge variant={logLevel(record) === "error" ? "destructive" : logLevel(record) === "warning" ? "warning" : "outline"}>
        {logLevelLabel(logLevel(record))}
      </Badge>
      <Badge variant="secondary">{logLayerLabel(logLayer(record))}</Badge>
      <Badge variant="outline">{logOutcomeLabel(logOutcome(record))}</Badge>
    </div>
  </header>

  {#if redactedFields.length > 0}
    <Alert.Root variant="warning">
      <ShieldAlert aria-hidden="true" />
      <Alert.Title class="log-redacted-notice">
        {m.logs_redacted_notice({ fields: redactedFields.join(", ") })}
      </Alert.Title>
    </Alert.Root>
  {/if}

  <Tabs.Root value="summary" class="log-detail-tabs">
    <Tabs.List variant="line" aria-label={m.logs_summary_tab()}>
      <Tabs.Trigger value="summary">{m.logs_summary_tab()}</Tabs.Trigger>
      <Tabs.Trigger value="request">{m.logs_request_tab()}</Tabs.Trigger>
      <Tabs.Trigger value="response">{m.logs_response_tab()}</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="summary" class="log-detail-tab-content">
      <ScrollArea class="log-summary-scroll">
        <dl class="log-summary-list">
          {#each summaryRows as row (row.label)}
            <div class="log-summary-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          {/each}
        </dl>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="request" class="log-detail-tab-content">
      {#if request}
        {#if request.truncated}
          <Alert.Root variant="warning">
            <FileWarning aria-hidden="true" />
            <Alert.Title>{m.logs_truncated_notice({ original: request.originalBytes, stored: request.storedBytes })}</Alert.Title>
          </Alert.Root>
        {/if}
        <PreformattedJson source={request.json} title={m.logs_request_tab()} />
      {:else}
        <p class="log-payload-empty">{m.logs_request_unavailable()}</p>
      {/if}
    </Tabs.Content>

    <Tabs.Content value="response" class="log-detail-tab-content">
      {#if errorMessage}
        <Alert.Root variant="destructive">
          <FileWarning aria-hidden="true" />
          <Alert.Title>{m.logs_failure()}</Alert.Title>
          <Alert.Description class="log-error-message"><code>{errorMessage}</code></Alert.Description>
        </Alert.Root>
      {/if}
      {#if response?.truncated}
        <Alert.Root variant="warning">
          <FileWarning aria-hidden="true" />
          <Alert.Title>{m.logs_truncated_notice({ original: response.originalBytes, stored: response.storedBytes })}</Alert.Title>
        </Alert.Root>
      {/if}
      {#if responseJSON}
        <PreformattedJson source={responseJSON} title={m.logs_response_tab()} />
      {:else}
        <p class="log-payload-empty">{m.logs_response_unavailable()}</p>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</article>

<style>
  @layer blocks {
    .log-detail {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-width: 0;
      min-height: 0;
      height: 100%;
      padding: var(--space-4);
    }

    .log-detail-header {
      display: grid;
      grid-template-areas:
        "time badges"
        "title title";
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
    }

    .log-detail-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: flex-start;
      grid-area: badges;
      justify-content: flex-end;
    }

    .log-detail-time {
      grid-area: time;
      min-width: 0;
    }

    .log-detail-time,
    .log-detail-title {
      margin: 0;
    }

    .log-detail-time {
      color: var(--muted-foreground);
      font-family: var(--font-mono);
      font-size: 0.7rem;
    }

    .log-detail-title {
      grid-area: title;
      min-width: 0;
      font-size: 0.95rem;
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    :global(.log-redacted-notice) {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :global(.log-error-message) {
      overflow-wrap: anywhere;
      font-family: var(--font-mono);
    }

    :global(.log-detail-tabs) {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
    }

    :global(.log-detail-tab-content) {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    :global(.log-summary-scroll) {
      flex: 1 1 auto;
      min-height: 0;
    }

    .log-summary-list {
      display: grid;
      margin: 0;
      border: 1px solid var(--border);
      background: var(--card);
    }

    .log-summary-row {
      display: grid;
      grid-template-columns: minmax(7rem, 0.32fr) minmax(0, 1fr);
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--border);
      font-size: 0.75rem;
    }

    .log-summary-row:last-child {
      border-bottom: 0;
    }

    .log-summary-row dt {
      color: var(--muted-foreground);
    }

    .log-summary-row dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-family: var(--font-mono);
    }

    .log-payload-empty {
      display: grid;
      place-items: center;
      min-height: 12rem;
      margin: 0;
      border: 1px dashed var(--border);
      color: var(--muted-foreground);
      font-size: 0.78rem;
    }
  }
</style>
