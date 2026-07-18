<script lang="ts">
  import { tick } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { get } from "svelte/store";
  import { createVirtualizer } from "@tanstack/svelte-virtual";
  import { Eraser, Search, TriangleAlert } from "@lucide/svelte";
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
  import {
    buildLogListItems,
    buildVisibleLogListRows,
    type OperationLogGroup,
    type VisibleLogListRow,
  } from "$lib/log-grouping.js";
  import { filterLogs, logOutcome } from "$lib/log-presentation.js";
  import { LogLayer, LogLevel, LogOutcome } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";
  import LogDetail from "./LogDetail.svelte";
  import LogDetailNavigation from "./LogDetailNavigation.svelte";
  import LogDetailSheet from "./LogDetailSheet.svelte";
  import LogOperationChild from "./LogOperationChild.svelte";
  import LogOperationGroup from "./LogOperationGroup.svelte";
  import LogRecordRow from "./LogRecordRow.svelte";

  const DETAIL_SHEET_BREAKPOINT_PX = 62 * 16;
  const LOG_ROW_ESTIMATE_PX = 64;
  const LOG_ROW_OVERSCAN = 8;

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
  let workbenchWidth = $state(0);
  let listViewport: HTMLElement | null = $state(null);
  let operationOpenOverrides = $state<Record<string, boolean>>({});
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let filteredRecords = $derived(filterLogs(logController.records, logController.query, logController.filters));
  let logItems = $derived(buildLogListItems(logController.records, filteredRecords));
  let filtersActive = $derived(
    logController.query.trim().length > 0
      || logController.filters.level !== "all"
      || logController.filters.layer !== "all"
      || logController.filters.outcome !== "all",
  );
  let visibleRows = $derived.by(() => buildVisibleLogListRows(logItems, operationOpen));
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

  function getScrollElement() {
    return listViewport;
  }

  function getItemKey(index: number) {
    return visibleRows[index]?.key ?? index;
  }

  const rowVirtualizer = createVirtualizer<HTMLElement, HTMLElement>({
    count: 0,
    getScrollElement,
    estimateSize: () => LOG_ROW_ESTIMATE_PX,
    getItemKey,
    overscan: LOG_ROW_OVERSCAN,
    anchorTo: "end",
  });

  const measureVirtualRow: Attachment<HTMLElement> = (element) => {
    const virtualizer = get(rowVirtualizer);
    virtualizer.measureElement(element);
    return () => virtualizer.measureElement(null);
  };

  $effect(() => {
    get(rowVirtualizer).setOptions({ count: visibleRows.length });
  });

  $effect(() => {
    const newest = logController.records.at(-1);
    const viewport = listViewport;
    if (!newest || !viewport) return;

    void tick().then(() => get(rowVirtualizer).scrollToEnd({ behavior: "auto" }));
  });

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

  function operationDefaultOpen(group: OperationLogGroup) {
    return group.operation === null
      || logOutcome(group.representative) !== LogOutcome.LogOutcomeSucceeded;
  }

  function operationOpen(group: OperationLogGroup) {
    return filtersActive
      || (operationOpenOverrides[group.operationId] ?? operationDefaultOpen(group));
  }

  function toggleOperation(group: OperationLogGroup) {
    operationOpenOverrides = {
      ...operationOpenOverrides,
      [group.operationId]: !operationOpen(group),
    };
  }

  function visibleRowRecordID(row: VisibleLogListRow) {
    return row.kind === "operation"
      ? recordID(row.group.representative)
      : recordID(row.record);
  }

  function selectedVisibleRowIndex() {
    const exactIndex = visibleRows.findIndex((row) => visibleRowRecordID(row) === selectedId);
    if (exactIndex >= 0) return exactIndex;

    return visibleRows.findIndex((row) => row.kind === "operation"
      && row.group.allRecords.some((record) => recordID(record) === selectedId));
  }

  function adjacentVisibleRowIndex(offset: -1 | 1) {
    const currentIndex = selectedVisibleRowIndex();
    const targetIndex = currentIndex < 0
      ? (offset < 0 ? visibleRows.length - 1 : 0)
      : currentIndex + offset;
    return visibleRows[targetIndex] ? targetIndex : -1;
  }

  function selectVisibleRowAt(index: number) {
    const row = visibleRows[index];
    if (!row) return false;

    selectRecord(visibleRowRecordID(row));
    get(rowVirtualizer).scrollToIndex(index, { align: "auto" });
    return true;
  }

  function selectVisibleRecord(offset: -1 | 1) {
    return selectVisibleRowAt(adjacentVisibleRowIndex(offset));
  }

  function navigateVisibleTree(key: "ArrowLeft" | "ArrowRight") {
    const selectedIndex = selectedVisibleRowIndex();
    const row = visibleRows[selectedIndex];
    if (!row) return false;

    if (key === "ArrowRight" && row.kind === "operation" && !operationOpen(row.group)) {
      toggleOperation(row.group);
      void tick().then(() => selectVisibleRowAt(selectedIndex + 1));
      return true;
    }

    if (key === "ArrowLeft") {
      if (row.kind === "operation-child") {
        const parentIndex = visibleRows.findIndex((candidate) => candidate.kind === "operation"
          && candidate.group.operationId === row.operationId);
        return selectVisibleRowAt(parentIndex);
      }
      if (row.kind === "operation" && operationOpen(row.group)) {
        toggleOperation(row.group);
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
      operationOpenOverrides = {};
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
      >
        <ScrollArea class="log-list-scroll" bind:viewportRef={listViewport}>
          <div class="log-list" style:height={`${$rowVirtualizer.getTotalSize()}px`}>
            {#each $rowVirtualizer.getVirtualItems() as virtualRow (virtualRow.key)}
              {@const row = visibleRows[virtualRow.index]}
              {#if row}
                <div
                  class="log-virtual-row"
                  data-index={virtualRow.index}
                  style:transform={`translateY(${virtualRow.start}px)`}
                  {@attach measureVirtualRow}
                >
                  {#if row.kind === "operation"}
                    <LogOperationGroup
                      group={row.group}
                      {selectedId}
                      open={operationOpen(row.group)}
                      onSelect={selectRecord}
                      onOpen={openRecord}
                      onToggle={() => toggleOperation(row.group)}
                    />
                  {:else if row.kind === "operation-child"}
                    <LogOperationChild
                      record={row.record}
                      selected={recordID(row.record) === selectedId}
                      last={row.last}
                      onSelect={selectRecord}
                      onOpen={openRecord}
                    />
                  {:else}
                    <LogRecordRow
                      record={row.record}
                      selected={recordID(row.record) === selectedId}
                      onSelect={selectRecord}
                      onOpen={openRecord}
                    />
                  {/if}
                </div>
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
  bind:clientWidth={workbenchWidth}
>
  <header class="log-toolbar">
    <div class="log-toolbar-copy">
      <p>{m.logs_description()}</p>
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
      position: relative;
      width: 100%;
      min-height: 100%;
    }

    .log-virtual-row {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      min-width: 0;
    }

  }

  @layer exceptions {
    .log-workbench[data-keyboard-navigation="true"] {
      --log-row-hover-surface: transparent;
      --log-toggle-hover-border: var(--border);
    }
  }
</style>
