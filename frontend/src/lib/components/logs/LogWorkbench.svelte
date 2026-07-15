<script lang="ts">
  import { tick } from "svelte";
  import { Eraser, Radio, Search, TriangleAlert } from "@lucide/svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Resizable from "$lib/components/ui/resizable/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { clearLogJournal } from "$lib/controller.js";
  import { logController, recordID } from "$lib/features/logs/state.svelte.js";
  import { followLogTail } from "$lib/features/logs/follow-tail.js";
  import { buildLogListItems } from "$lib/log-grouping.js";
  import { filterLogs } from "$lib/log-presentation.js";
  import { LogLayer, LogLevel, LogOutcome } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";
  import LogDetail from "./LogDetail.svelte";
  import LogDetailNavigation from "./LogDetailNavigation.svelte";
  import LogDetailSheet from "./LogDetailSheet.svelte";
  import LogOperationGroup from "./LogOperationGroup.svelte";
  import LogRecordRow from "./LogRecordRow.svelte";

  const DETAIL_SHEET_BREAKPOINT_PX = 62 * 16;

  const levelOptions = [
    { value: "all", label: m.logs_all_levels() },
    { value: LogLevel.LogLevelDebug, label: m.logs_level_debug() },
    { value: LogLevel.LogLevelInfo, label: m.logs_level_info() },
    { value: LogLevel.LogLevelWarning, label: m.logs_level_warning() },
    { value: LogLevel.LogLevelError, label: m.logs_level_error() },
  ];
  const layerOptions = [
    { value: "all", label: m.logs_all_layers() },
    { value: LogLayer.LogLayerService, label: m.logs_layer_service() },
    { value: LogLayer.LogLayerSession, label: m.logs_layer_session() },
    { value: LogLayer.LogLayerOperation, label: m.logs_layer_operation() },
    { value: LogLayer.LogLayerInteraction, label: m.logs_layer_interaction() },
    { value: LogLayer.LogLayerCTAP, label: m.logs_layer_ctap() },
  ];
  const outcomeOptions = [
    { value: "all", label: m.logs_all_outcomes() },
    { value: LogOutcome.LogOutcomeEvent, label: m.logs_outcome_event() },
    { value: LogOutcome.LogOutcomeSucceeded, label: m.logs_outcome_succeeded() },
    { value: LogOutcome.LogOutcomeFailed, label: m.logs_outcome_failed() },
    { value: LogOutcome.LogOutcomeCanceled, label: m.logs_outcome_canceled() },
  ];

  let clearOpen = $state(false);
  let detailOpen = $state(false);
  let keyboardNavigation = $state(false);
  let workbench: HTMLElement | null = $state(null);
  let workbenchWidth = $state(0);
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let filteredRecords = $derived(filterLogs(logController.records, logController.query, logController.filters));
  let logItems = $derived(buildLogListItems(logController.records, filteredRecords));
  let selectedRecord = $derived(
    filteredRecords.find((record) => recordID(record) === logController.selectedId)
      ?? filteredRecords.at(-1)
      ?? null,
  );
  let selectedId = $derived(selectedRecord ? recordID(selectedRecord) : null);
  let selectedRecordIndex = $derived.by(() => {
    const selected = selectedRecord;
    if (!selected) return -1;
    return filteredRecords.findIndex((record) => recordID(record) === recordID(selected));
  });
  let currentLevelLabel = $derived(levelOptions.find((option) => option.value === logController.filters.level)?.label ?? m.logs_all_levels());
  let currentLayerLabel = $derived(layerOptions.find((option) => option.value === logController.filters.layer)?.label ?? m.logs_all_layers());
  let currentOutcomeLabel = $derived(outcomeOptions.find((option) => option.value === logController.filters.outcome)?.label ?? m.logs_all_outcomes());
  let useDetailSheet = $derived(workbenchWidth > 0 && workbenchWidth <= DETAIL_SHEET_BREAKPOINT_PX);
  let filtersActive = $derived(
    logController.query.trim().length > 0
      || logController.filters.level !== "all"
      || logController.filters.layer !== "all"
      || logController.filters.outcome !== "all",
  );

  function handleQuery(event: Event) {
    logController.setQuery((event.currentTarget as HTMLInputElement).value);
  }

  function handleLevel(value: string) {
    logController.setFilters({ ...logController.filters, level: value as LogLevel | "all" });
  }

  function handleLayer(value: string) {
    logController.setFilters({ ...logController.filters, layer: value as LogLayer | "all" });
  }

  function handleOutcome(value: string) {
    logController.setFilters({ ...logController.filters, outcome: value as LogOutcome | "all" });
  }

  function selectRecord(id: string) {
    logController.select(id);
  }

  function openRecord(id: string) {
    selectRecord(id);
    if (useDetailSheet) detailOpen = true;
  }

  function selectRecordAt(index: number) {
    const record = filteredRecords[index];
    if (record) logController.select(recordID(record));
  }

  function isEditableTarget(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function captureWorkbench(element: HTMLElement) {
    workbench = element;
    return () => {
      if (workbench === element) workbench = null;
    };
  }

  function visibleRecordElements() {
    return Array.from(workbench?.querySelectorAll<HTMLElement>("[data-log-record-id]") ?? []);
  }

  function selectedVisibleRecordElement(elements = visibleRecordElements()) {
    return elements.find((element) => element.getAttribute("aria-pressed") === "true")
      ?? workbench?.querySelector<HTMLElement>(
        '[data-log-operation-group][data-group-selected="true"] [data-log-operation-record]',
      )
      ?? null;
  }

  function selectRecordElement(element: HTMLElement | null | undefined) {
    const id = element?.dataset.logRecordId;
    if (!id || !element) return false;

    selectRecord(id);
    element.scrollIntoView?.({ block: "nearest" });
    return true;
  }

  function adjacentVisibleRecord(offset: -1 | 1) {
    const elements = visibleRecordElements();
    const selected = selectedVisibleRecordElement(elements);
    const currentIndex = selected ? elements.indexOf(selected) : -1;
    const targetIndex = currentIndex < 0
      ? (offset < 0 ? elements.length - 1 : 0)
      : currentIndex + offset;
    return elements[targetIndex] ?? null;
  }

  function selectVisibleRecord(offset: -1 | 1) {
    return selectRecordElement(adjacentVisibleRecord(offset));
  }

  function navigateVisibleTree(key: "ArrowLeft" | "ArrowRight") {
    const selected = selectedVisibleRecordElement();
    if (!selected) return false;

    const group = selected?.closest<HTMLElement>("[data-log-operation-group]");
    const parent = group?.querySelector<HTMLElement>("[data-log-operation-record]");
    const toggle = group?.querySelector<HTMLButtonElement>("[data-log-operation-toggle]");

    if (key === "ArrowRight" && selected === parent && toggle?.getAttribute("aria-expanded") === "false") {
      toggle.click();
      void tick().then(() => selectVisibleRecord(1));
      return true;
    }

    if (key === "ArrowLeft" && group) {
      if (selected !== parent) return selectRecordElement(parent);
      if (toggle?.getAttribute("aria-expanded") === "true") {
        toggle.click();
        return true;
      }
    }

    return selectVisibleRecord(key === "ArrowLeft" ? -1 : 1);
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (
      useDetailSheet
      || !selectedRecord
      || !event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || isEditableTarget(event.target)
    ) {
      return;
    }

    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    keyboardNavigation = true;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectVisibleRecord(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectVisibleRecord(1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (navigateVisibleTree(event.key)) event.preventDefault();
    }
  }

  function handleWindowPointerMove(event: PointerEvent) {
    const moved = pointerX === null
      || pointerY === null
      || event.clientX !== pointerX
      || event.clientY !== pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (moved) keyboardNavigation = false;
  }

  function handleWindowPointerDown() {
    keyboardNavigation = false;
  }

  async function clearLogs() {
    if (await clearLogJournal()) {
      clearOpen = false;
      detailOpen = false;
    }
  }
</script>

<svelte:window
  onkeydown={handleWindowKeydown}
  onpointermove={handleWindowPointerMove}
  onpointerdown={handleWindowPointerDown}
/>

{#snippet logMaster()}
  <section class="log-master" aria-label={m.logs()}>
    {#if filteredRecords.length === 0}
      <EmptyState title={m.logs_no_match_title()} message={m.logs_no_match_message()} variant="compact" />
    {:else}
      <div
        class="log-list-scroll-frame"
        use:followLogTail={{ enabled: logController.followLive, version: logController.records.length }}
      >
        <ScrollArea class="log-list-scroll">
          <div class="log-list">
            {#each logItems as item (item.kind === "operation" ? `operation:${item.operationId}` : recordID(item.record))}
              {#if item.kind === "operation"}
                <LogOperationGroup
                  group={item}
                  {selectedId}
                  revealMatches={filtersActive}
                  onSelect={selectRecord}
                  onOpen={openRecord}
                />
              {:else}
                <LogRecordRow
                  record={item.record}
                  selected={recordID(item.record) === selectedId}
                  onSelect={selectRecord}
                  onOpen={openRecord}
                />
              {/if}
            {/each}
          </div>
        </ScrollArea>
      </div>
    {/if}
  </section>
{/snippet}

{#snippet logDetail()}
  <section class="log-detail-frame" aria-live="polite">
    {#if selectedRecord}
      <LogDetailNavigation
        position={selectedRecordIndex + 1}
        total={filteredRecords.length}
        canPrevious={selectedRecordIndex > 0}
        canNext={selectedRecordIndex >= 0 && selectedRecordIndex < filteredRecords.length - 1}
        onPrevious={() => selectRecordAt(selectedRecordIndex - 1)}
        onNext={() => selectRecordAt(selectedRecordIndex + 1)}
      />
      <LogDetail record={selectedRecord} />
    {/if}
  </section>
{/snippet}

<section
  class="log-workbench"
  data-keyboard-navigation={keyboardNavigation ? "true" : undefined}
  aria-label={m.logs()}
  {@attach captureWorkbench}
  bind:clientWidth={workbenchWidth}
>
  <header class="log-toolbar">
    <div class="log-toolbar-copy">
      <p>{m.logs_description()}</p>
      <span>{m.logs_count({ shown: filteredRecords.length, total: logController.records.length })}</span>
    </div>

    <div class="log-toolbar-controls">
      <InputGroup.Root class="log-search">
        <InputGroup.Addon><Search aria-hidden="true" /></InputGroup.Addon>
        <InputGroup.Input
          type="search"
          value={logController.query}
          placeholder={m.logs_search_placeholder()}
          aria-label={m.logs_search_placeholder()}
          autocomplete="off"
          oninput={handleQuery}
        />
      </InputGroup.Root>

      <Select.Root type="single" value={logController.filters.level} onValueChange={handleLevel} items={levelOptions}>
        <Select.Trigger aria-label={m.logs_level()}>{currentLevelLabel}</Select.Trigger>
        <Select.Content side="bottom" align="end" sideOffset={6}>
          <Select.Group>
            {#each levelOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      <Select.Root type="single" value={logController.filters.layer} onValueChange={handleLayer} items={layerOptions}>
        <Select.Trigger aria-label={m.logs_layer()}>{currentLayerLabel}</Select.Trigger>
        <Select.Content side="bottom" align="end" sideOffset={6}>
          <Select.Group>
            {#each layerOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      <Select.Root type="single" value={logController.filters.outcome} onValueChange={handleOutcome} items={outcomeOptions}>
        <Select.Trigger aria-label={m.logs_outcome()}>{currentOutcomeLabel}</Select.Trigger>
        <Select.Content side="bottom" align="end" sideOffset={6}>
          <Select.Group>
            {#each outcomeOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      <Button
        type="button"
        variant={logController.followLive ? "secondary" : "outline"}
        aria-pressed={logController.followLive}
        onclick={() => logController.setFollowLive(!logController.followLive)}
      >
        <Radio data-icon="inline-start" aria-hidden="true" />
        {m.logs_follow_live()}
      </Button>
      <Button type="button" variant="outline" disabled={logController.records.length === 0} onclick={() => clearOpen = true}>
        <Eraser data-icon="inline-start" aria-hidden="true" />
        {m.logs_clear()}
      </Button>
    </div>

    {#if logController.historyTruncated}
      <Alert.Root variant="warning">
        <TriangleAlert aria-hidden="true" />
        <Alert.Title>{m.logs_history_truncated_title()}</Alert.Title>
        <Alert.Description>{m.logs_history_truncated_description()}</Alert.Description>
      </Alert.Root>
    {/if}
  </header>

  {#if logController.records.length === 0}
    <EmptyState title={m.logs_empty_title()} message={m.logs_empty_message()} variant="workspace" />
  {:else if useDetailSheet}
    <div class="log-master-detail log-master-detail-compact">
      {@render logMaster()}
    </div>
  {:else}
    <Resizable.PaneGroup direction="horizontal" keyboardResizeBy={5} class="log-master-detail">
      <Resizable.Pane defaultSize={65} minSize={35} maxSize={70}>
        {@render logMaster()}
      </Resizable.Pane>
      <Resizable.Handle withHandle />
      <Resizable.Pane defaultSize={35} minSize={30} maxSize={65}>
        {@render logDetail()}
      </Resizable.Pane>
    </Resizable.PaneGroup>
  {/if}
</section>

{#if selectedRecord}
  <LogDetailSheet
    open={detailOpen}
    record={selectedRecord}
    position={selectedRecordIndex + 1}
    total={filteredRecords.length}
    canPrevious={selectedRecordIndex > 0}
    canNext={selectedRecordIndex >= 0 && selectedRecordIndex < filteredRecords.length - 1}
    onPrevious={() => selectRecordAt(selectedRecordIndex - 1)}
    onNext={() => selectRecordAt(selectedRecordIndex + 1)}
    onOpenChange={(open) => detailOpen = open}
  />
{/if}

<AlertDialog.Root open={clearOpen} onOpenChange={(open) => clearOpen = open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
      <AlertDialog.Title>{m.logs_clear_title()}</AlertDialog.Title>
      <AlertDialog.Description>{m.logs_clear_description()}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{m.cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={clearLogs}>{m.logs_clear_confirm()}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  @layer blocks {
    .log-workbench {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: var(--space-3);
      min-width: 0;
      min-height: 0;
      height: 100%;
    }

    .log-toolbar {
      display: grid;
      gap: var(--space-3);
    }

    .log-toolbar-copy,
    .log-toolbar-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    .log-toolbar-copy {
      justify-content: space-between;
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }

    .log-toolbar-copy p {
      margin: 0;
    }

    .log-toolbar-controls {
      align-items: stretch;
    }

    :global(.log-search) {
      flex: 1 1 18rem;
      min-width: 12rem;
    }

    :global(.log-master-detail) {
      min-width: 0;
      min-height: 0;
      height: 100%;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--card);
    }

    .log-master-detail-compact {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .log-master,
    .log-detail-frame {
      min-width: 0;
      min-height: 0;
      height: 100%;
    }

    .log-master {
      background: var(--background);
    }

    .log-detail-frame {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .log-list-scroll-frame,
    :global(.log-list-scroll) {
      height: 100%;
    }

    .log-list {
      display: grid;
      align-content: start;
    }

  }

  @layer exceptions {
    .log-workbench[data-keyboard-navigation="true"] {
      --log-row-hover-surface: transparent;
      --log-toggle-hover-border: var(--border);
    }
  }
</style>
