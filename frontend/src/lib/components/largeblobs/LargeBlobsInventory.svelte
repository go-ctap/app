<script lang="ts">
  import { ChevronRight, Database, FlaskConical, RefreshCw } from "@lucide/svelte";

  import {
    EntryState,
    type DecodeMode,
  } from "../../../../bindings/github.com/telesma-app/kit/model/largeblobs";

  import LargeBlobInspector from "$lib/components/largeblobs/LargeBlobInspector.svelte";
  import CredentialInventoryToolbar from "$lib/components/shared/CredentialInventoryToolbar.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as ExpandableDataTable from "$lib/components/shared/expandable-data-table";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import type {
    LargeBlobDecodeState,
    LargeBlobMutationState,
    LargeBlobReadState,
    LargeBlobsStatusFilter,
  } from "$lib/features/largeblobs/state";
  import type { LargeBlobEntryRow, LargeBlobsPresentation } from "$lib/largeblobs-presentation";

  import { m } from "../../../paraglide/messages.js";

  const SKELETON_ROWS = ["large-blob-1", "large-blob-2", "large-blob-3"] as const;

  type Props = {
    presentation: LargeBlobsPresentation;
    readState: LargeBlobReadState;
    decodeState: LargeBlobDecodeState;
    mutation: LargeBlobMutationState;
    decodeMode: DecodeMode;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: LargeBlobsStatusFilter) => void;
    onSelect: (entryIndex: number | null) => void | Promise<boolean>;
    onDecodeModeChange: (mode: DecodeMode) => void | Promise<boolean>;
    onWrite: (entryIndex: number) => void;
    onDelete: (entryIndex: number) => void | Promise<boolean>;
    onOpenLab: () => void;
    onReload: () => void | Promise<boolean>;
  };

  let {
    presentation,
    readState,
    decodeState,
    mutation,
    decodeMode,
    onQueryChange,
    onFilterChange,
    onSelect,
    onDecodeModeChange,
    onWrite,
    onDelete,
    onOpenLab,
    onReload,
  }: Props = $props();

  let filters = $derived([
    { value: "all" as const, label: m.large_blob_filter_all() },
    { value: "matched" as const, label: m.large_blob_filter_matched() },
    { value: "orphaned" as const, label: m.large_blob_filter_orphaned() },
    { value: "nonconforming" as const, label: m.large_blob_filter_nonconforming() },
    { value: "corrupt" as const, label: m.large_blob_filter_corrupt() },
  ] satisfies { value: LargeBlobsStatusFilter; label: string }[]);

  let selectionDisabled = $derived(
    presentation.loading || readState.phase === "loading" || mutation.kind !== "idle",
  );

  function clearFilters() {
    onQueryChange("");
    onFilterChange("all");
  }

  function entryStateLabel(row: LargeBlobEntryRow) {
    switch (row.state) {
      case EntryState.EntryStateMatched:
        return m.large_blob_entry_matched();
      case EntryState.EntryStateOrphaned:
        return m.large_blob_entry_orphaned();
      case EntryState.EntryStateNonconforming:
        return m.large_blob_entry_nonconforming();
      case EntryState.EntryStateCorrupt:
        return m.large_blob_entry_corrupt();
      default:
        return row.state;
    }
  }

  function entryStateVariant(row: LargeBlobEntryRow) {
    return row.state === EntryState.EntryStateMatched
      ? "secondary"
      : row.state === EntryState.EntryStateCorrupt ||
          row.state === EntryState.EntryStateNonconforming
        ? "destructive"
        : "outline";
  }
</script>

{#snippet largeBlobsTableHeader()}
  <th scope="col" data-slot="expandable-data-table-disclosure-header">
    {m.large_blob_entry()}
  </th>
  <th scope="col">{m.large_blob_target()}</th>
  <th scope="col" class="large-blobs-table-state">{m.status()}</th>
  <th scope="col" class="large-blobs-table-bytes" data-align="end">
    {m.large_blob_ciphertext()}
  </th>
  <th scope="col" class="large-blobs-table-payload" data-align="end">{m.payload()}</th>
{/snippet}

<section class="large-blobs-inventory">
  {#if presentation.hasReport && !presentation.emptyInventory}
    <CredentialInventoryToolbar
      id="large-blobs-search"
      query={presentation.query}
      statusFilter={presentation.statusFilter}
      {filters}
      searchPlaceholder={m.large_blobs_search_placeholder()}
      {onQueryChange}
      {onFilterChange}
    />
  {/if}

  {#if presentation.loading && !presentation.hasReport}
    <CredentialInventoryToolbar
      id="large-blobs-search"
      query={presentation.query}
      statusFilter={presentation.statusFilter}
      {filters}
      searchPlaceholder={m.large_blobs_search_placeholder()}
      loading
      {onQueryChange}
      {onFilterChange}
    />

    <ExpandableDataTable.Root
      class="large-blobs-table large-blobs-table-skeleton"
      aria-label={m.waiting_for_authenticator_response()}
      aria-busy="true"
      header={largeBlobsTableHeader}
    >
      {#each SKELETON_ROWS as row (row)}
        <tr data-slot="expandable-data-table-summary-row">
          <td>
            <div class="large-blobs-row-primary">
              <Skeleton class="large-blobs-skeleton-disclosure" />
              <div class="large-blobs-skeleton-copy">
                <Skeleton class="large-blobs-skeleton-primary" />
                <Skeleton class="large-blobs-skeleton-entry-id" />
              </div>
            </div>
          </td>
          <td>
            <div class="large-blobs-skeleton-copy">
              <Skeleton class="large-blobs-skeleton-primary" />
              <Skeleton class="large-blobs-skeleton-secondary" />
            </div>
          </td>
          <td class="large-blobs-table-state">
            <Skeleton class="large-blobs-skeleton-badge" />
          </td>
          <td class="large-blobs-table-bytes">
            <Skeleton class="large-blobs-skeleton-byte-count" />
          </td>
          <td class="large-blobs-table-payload">
            <Skeleton class="large-blobs-skeleton-byte-count" />
          </td>
        </tr>
      {/each}
    </ExpandableDataTable.Root>
  {:else if presentation.emptyInventory}
    <ExpandableDataTable.Root
      class="large-blobs-table"
      aria-label={m.large_blob_entries()}
      header={largeBlobsTableHeader}
    >
      <tr class="large-blobs-empty-row">
        <td colspan="5">
          <EmptyState
            title={m.large_blobs_empty_title()}
            message={m.large_blobs_empty_message()}
            variant="compact"
          >
            {#snippet icon()}<Database aria-hidden="true" />{/snippet}

            {#snippet actions()}
              <Button type="button" onclick={onOpenLab}>
                <FlaskConical data-icon="inline-start" aria-hidden="true" />
                {m.open_webauthn_lab()}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={presentation.reloadDisabled}
                onclick={onReload}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {m.reload_inventory()}
              </Button>
            {/snippet}
          </EmptyState>
        </td>
      </tr>
    </ExpandableDataTable.Root>
  {:else if presentation.emptyFilteredResult}
    <EmptyState
      title={m.large_blobs_no_filtered_results_title()}
      message={m.large_blobs_no_filtered_results_message()}
      variant="compact"
    >
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={clearFilters}>{m.clear_filters()}</Button>
      {/snippet}
    </EmptyState>
  {:else if presentation.hasReport}
    <ExpandableDataTable.Root
      class="large-blobs-table"
      aria-label={m.large_blob_entries()}
      header={largeBlobsTableHeader}
    >
      {#each presentation.rows as row (row.id)}
        {@const selected = presentation.selectedEntryIndex === row.index}
        <ExpandableDataTable.Row
          detailsId={`large-blob-row-details-${row.index}`}
          open={selected}
          disabled={selectionDisabled}
          columnCount={5}
          onOpenChange={(open) => onSelect(open ? row.index : null)}
        >
          {#snippet summary(triggerProps)}
            <td>
              <div class="large-blobs-row-primary">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label={m.large_blob_entry_number({ index: row.index })}
                  title={selected ? m.close() : m.large_blob_details()}
                  {...triggerProps}
                >
                  <ChevronRight
                    class="large-blobs-row-chevron"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                </Button>
                <span class="large-blobs-row-copy">
                  <strong>{m.large_blob_entry_number({ index: row.index })}</strong>
                  <code>{row.credentialIDHex || "—"}</code>
                </span>
              </div>
            </td>
            <td>
              <span class="large-blobs-row-copy">
                <strong>{row.hasTarget ? row.rpName : m.large_blob_no_target()}</strong>
                <span>{row.hasTarget ? row.displayName : m.large_blob_cleanup_only()}</span>
              </span>
            </td>
            <td class="large-blobs-table-state">
              <Badge variant={entryStateVariant(row)}>{entryStateLabel(row)}</Badge>
            </td>
            <td class="large-blobs-table-bytes">
              {m.bytes_count({ count: row.ciphertextByteCount })}
            </td>
            <td class="large-blobs-table-payload">
              {#if row.payloadByteCount !== null}
                {m.bytes_count({ count: row.payloadByteCount })}
              {:else}
                {m.large_blob_declared_bytes({
                  count: row.declaredPayloadByteCount,
                })}
              {/if}
            </td>
          {/snippet}
          {#snippet details()}
            <LargeBlobInspector
              {row}
              {readState}
              {decodeState}
              {decodeMode}
              mutationDisabled={presentation.mutationDisabled}
              {onDecodeModeChange}
              {onWrite}
              {onDelete}
            />
          {/snippet}
        </ExpandableDataTable.Row>
      {/each}
    </ExpandableDataTable.Root>
  {/if}
</section>

<style>
  @layer blocks {
    .large-blobs-inventory {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    :global(.large-blobs-table) {
      min-width: 52rem;
      table-layout: fixed;
    }

    :global(.large-blobs-empty-row > td) {
      padding: 0;
      white-space: normal;
    }

    :global(.large-blobs-table th:first-child),
    :global(.large-blobs-table [data-slot="expandable-data-table-summary-row"] > td:first-child) {
      width: 22%;
    }

    :global(.large-blobs-table th:nth-child(2)),
    :global(.large-blobs-table [data-slot="expandable-data-table-summary-row"] > td:nth-child(2)) {
      width: 30%;
    }

    :global(.large-blobs-table-state) {
      width: 18%;
    }

    :global(.large-blobs-table-bytes),
    :global(.large-blobs-table-payload) {
      width: 15%;
      color: var(--muted-foreground);
      font-size: 0.72rem;
      text-align: end;
    }

    .large-blobs-row-copy {
      display: grid;
      min-width: 0;
      gap: var(--space-1);
    }

    .large-blobs-row-primary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .large-blobs-row-copy strong,
    .large-blobs-row-copy span,
    .large-blobs-row-copy code {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .large-blobs-row-copy span,
    .large-blobs-row-copy code {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    :global(.large-blobs-row-chevron) {
      transition: transform 120ms ease;
    }

    .large-blobs-skeleton-copy {
      display: grid;
      align-content: center;
      gap: var(--space-1);
      min-width: 0;
      min-height: 2.5rem;
    }

    :global(.large-blobs-skeleton-disclosure) {
      width: 1.5rem;
      height: 1.5rem;
    }

    :global(.large-blobs-skeleton-primary) {
      width: 62%;
      height: 0.75rem;
    }

    :global(.large-blobs-skeleton-entry-id) {
      width: 92%;
      height: 0.6rem;
    }

    :global(.large-blobs-skeleton-secondary) {
      width: 72%;
      height: 0.6rem;
    }

    :global(.large-blobs-skeleton-badge) {
      width: 4.5rem;
      height: 1.25rem;
    }

    :global(.large-blobs-skeleton-byte-count) {
      width: 3.75rem;
      height: 0.75rem;
      margin-left: auto;
    }

    @container workspace (max-width: 54rem) {
      :global(.large-blobs-table) {
        min-width: 32rem;
      }

      :global(.large-blobs-table-bytes),
      :global(.large-blobs-table-payload) {
        display: none;
      }

      :global(.large-blobs-table th:first-child),
      :global(.large-blobs-table [data-slot="expandable-data-table-summary-row"] > td:first-child) {
        width: 32%;
      }

      :global(.large-blobs-table th:nth-child(2)),
      :global(
        .large-blobs-table [data-slot="expandable-data-table-summary-row"] > td:nth-child(2)
      ) {
        width: 43%;
      }

      :global(.large-blobs-table-state) {
        width: 25%;
      }
    }
  }

  @layer exceptions {
    :global(
      .large-blobs-table
        [data-slot="expandable-data-table-summary-row"][data-open="true"]
        .large-blobs-row-chevron
    ) {
      transform: rotate(90deg);
    }
  }
</style>
