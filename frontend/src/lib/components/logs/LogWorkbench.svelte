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
  import { clearLogJournal } from "$lib/logs-controller.js";
  import { logController, recordID } from "$lib/features/logs/state.svelte.js";
  import { filterLogs } from "$lib/log-presentation.js";
  import { LogOutcome } from "../../../../bindings/github.com/go-ctap/kit/model/index.js";

  import { m } from "../../../paraglide/messages.js";
  import LogDetail from "./LogDetail.svelte";
  import LogDetailNavigation from "./LogDetailNavigation.svelte";
  import LogDetailSheet from "./LogDetailSheet.svelte";
  import LogRecordRow from "./LogRecordRow.svelte";

  const DETAIL_SHEET_BREAKPOINT_PX = 62 * 16;
  const LOG_ROW_ESTIMATE_PX = 64;
  const LOG_ROW_OVERSCAN = 8;

  const outcomeOptions = [
    { value: "all", label: m.logs_all_outcomes() },
    { value: LogOutcome.LogOutcomeSucceeded, label: m.logs_outcome_succeeded() },
    { value: LogOutcome.LogOutcomeFailed, label: m.logs_outcome_failed() },
    { value: LogOutcome.LogOutcomeCanceled, label: m.logs_outcome_canceled() },
  ];

  let clearOpen = $state(false);
  let detailOpen = $state(false);
  let keyboardNavigation = $state(false);
  let workbenchWidth = $state(0);
  let listViewport: HTMLElement | null = $state(null);
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let filteredRecords = $derived(filterLogs(logController.records, logController.query, logController.filters));
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
  let currentOutcomeLabel = $derived(
    outcomeOptions.find((option) => option.value === logController.filters.outcome)?.label
      ?? m.logs_all_outcomes(),
  );
  let useDetailSheet = $derived(workbenchWidth > 0 && workbenchWidth <= DETAIL_SHEET_BREAKPOINT_PX);

  function getScrollElement() {
    return listViewport;
  }

  function getItemKey(index: number) {
    const record = filteredRecords[index];
    return record ? recordID(record) : index;
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
    get(rowVirtualizer).setOptions({ count: filteredRecords.length });
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

  function handleOutcome(value: string) {
    logController.setFilters({ outcome: value as LogOutcome | "all" });
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
    if (!record) return false;

    logController.select(recordID(record));
    get(rowVirtualizer).scrollToIndex(index, { align: "auto" });
    return true;
  }

  function isEditableTarget(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
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
      || !["ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      return;
    }

    keyboardNavigation = true;
    const offset = event.key === "ArrowUp" ? -1 : 1;
    if (selectRecordAt(selectedRecordIndex + offset)) event.preventDefault();
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
      <div class="log-master-empty">
        <EmptyState title={m.logs_no_match_title()} message={m.logs_no_match_message()} variant="compact" />
      </div>
    {:else}
      <div class="log-list-scroll-frame">
        <ScrollArea class="log-list-scroll" bind:viewportRef={listViewport}>
          <div class="log-list" style:height={`${$rowVirtualizer.getTotalSize()}px`}>
            {#each $rowVirtualizer.getVirtualItems() as virtualRow (virtualRow.key)}
              {@const record = filteredRecords[virtualRow.index]}
              {#if record}
                <div
                  class="log-virtual-row"
                  data-index={virtualRow.index}
                  style:transform={`translateY(${virtualRow.start}px)`}
                  {@attach measureVirtualRow}
                >
                  <LogRecordRow
                    {record}
                    selected={recordID(record) === selectedId}
                    onSelect={selectRecord}
                    onOpen={openRecord}
                  />
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
      <Resizable.Pane defaultSize={65} minSize={35} maxSize={70} class="log-pane">
        {@render logMaster()}
      </Resizable.Pane>
      <Resizable.Handle withHandle />
      <Resizable.Pane defaultSize={35} minSize={30} maxSize={65} class="log-pane">
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

    :global(.log-pane) {
      min-width: 0;
      min-height: 0;
      height: 100%;
      overflow: hidden;
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
      overflow: hidden;
    }

    .log-master {
      background: var(--background);
    }

    .log-master-empty {
      height: 100%;
      min-height: 0;
      padding: var(--space-3);
    }

    .log-detail-frame {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .log-list-scroll-frame,
    :global(.log-list-scroll) {
      min-height: 0;
      height: 100%;
      overflow: hidden;
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
    }
  }
</style>
