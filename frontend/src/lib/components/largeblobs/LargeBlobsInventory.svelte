<script lang="ts">
  import { ChevronDown, FilterX } from "@lucide/svelte";

  import type { DecodeMode } from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";

  import LargeBlobInspector from "$lib/components/largeblobs/LargeBlobInspector.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type {
    LargeBlobMutationState,
    LargeBlobReadState,
    LargeBlobsStatusFilter,
  } from "$lib/features/largeblobs/state";
  import type {
    LargeBlobCredentialRow,
    LargeBlobsPresentation,
  } from "$lib/largeblobs-presentation";

  import { m } from "../../../paraglide/messages.js";

  const SKELETON_ROWS = ["large-blob-1", "large-blob-2", "large-blob-3"] as const;

  type Props = {
    presentation: LargeBlobsPresentation;
    readState: LargeBlobReadState;
    mutation: LargeBlobMutationState;
    decodeMode: DecodeMode;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: LargeBlobsStatusFilter) => void;
    onSelect: (credentialIDHex: string) => void | Promise<boolean>;
    onDecodeModeChange: (mode: DecodeMode) => void | Promise<boolean>;
    onWrite: (credentialIDHex: string) => void;
    onDelete: (credentialIDHex: string) => void | Promise<boolean>;
  };

  let {
    presentation,
    readState,
    mutation,
    decodeMode,
    onQueryChange,
    onFilterChange,
    onSelect,
    onDecodeModeChange,
    onWrite,
    onDelete,
  }: Props = $props();

  let filters = $derived([
    { value: "all" as const, label: m.large_blob_filter_all() },
    { value: "present" as const, label: m.large_blob_filter_present() },
    { value: "missing" as const, label: m.large_blob_filter_missing() },
    { value: "key-unavailable" as const, label: m.large_blob_filter_key_unavailable() },
  ] satisfies { value: LargeBlobsStatusFilter; label: string }[]);
  let currentFilterLabel = $derived(
    filters.find((filter) => filter.value === presentation.statusFilter)?.label
      ?? m.large_blob_filter_all(),
  );
  let filtersActive = $derived(
    Boolean(presentation.query.trim()) || presentation.statusFilter !== "all",
  );
  let selectionDisabled = $derived(
    presentation.loading || readState.phase === "loading" || mutation.kind !== "idle",
  );

  function handleFilterChange(value: string | string[]) {
    if (Array.isArray(value)) return;
    const selected = filters.find((filter) => filter.value === value);
    if (selected) onFilterChange(selected.value);
  }

  function clearFilters() {
    onQueryChange("");
    onFilterChange("all");
  }

  function credentialDetailsID(credentialIDHex: string) {
    return `large-blob-row-details-${credentialIDHex}`;
  }

  function blobStateLabel(row: LargeBlobCredentialRow) {
    if (!row.largeBlobKeyAvailable) return m.large_blob_state_key_unavailable();
    return row.blobPresent ? m.large_blob_state_present() : m.large_blob_state_missing();
  }

  function keyStateLabel(row: LargeBlobCredentialRow) {
    return row.largeBlobKeyAvailable
      ? m.large_blob_key_available()
      : m.large_blob_key_missing();
  }

  function compactKeyStateLabel(row: LargeBlobCredentialRow) {
    return row.largeBlobKeyAvailable ? m.state_available() : m.state_not_available();
  }

  function toggleCredential(row: LargeBlobCredentialRow) {
    const closing = presentation.selectedCredentialID === row.id;
    onSelect(closing ? "" : row.id);
  }
</script>

{#snippet largeBlobsTableHeader()}
  <Table.Header>
    <Table.Row>
      <Table.Head scope="col">{m.rp_name()}</Table.Head>
      <Table.Head scope="col">{m.user_name()}</Table.Head>
      <Table.Head scope="col" class="large-blobs-table-state">{m.status()}</Table.Head>
      <Table.Head scope="col" class="large-blobs-table-bytes">{m.payload()}</Table.Head>
      <Table.Head scope="col" class="large-blobs-table-key">{m.matrix_name_large_blob_key()}</Table.Head>
    </Table.Row>
  </Table.Header>
{/snippet}

<section class="large-blobs-inventory">
  {#if presentation.hasReport && !presentation.emptyInventory}
    <div class="large-blobs-inventory-toolbar">
      <Field.Field>
        <Field.FieldLabel class="sr-only" for="large-blobs-search">
          {m.large_blobs_search_placeholder()}
        </Field.FieldLabel>
        <Input
          id="large-blobs-search"
          type="search"
          value={presentation.query}
          placeholder={m.large_blobs_search_placeholder()}
          autocomplete="off"
          oninput={(event) => onQueryChange(event.currentTarget.value)}
        />
      </Field.Field>

      <Field.Field>
        <Field.FieldLabel class="sr-only" for="large-blobs-status-filter">{m.status()}</Field.FieldLabel>
        <Select.Root
          type="single"
          value={presentation.statusFilter}
          onValueChange={handleFilterChange}
          items={filters}
        >
          <Select.Trigger id="large-blobs-status-filter" aria-label={m.status()}>{currentFilterLabel}</Select.Trigger>
          <Select.Content side="bottom" align="end" sideOffset={6}>
            <Select.Group>
              {#each filters as filter (filter.value)}
                <Select.Item value={filter.value} label={filter.label}>{filter.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Field.Field>

      <Button variant="outline" type="button" disabled={!filtersActive} onclick={clearFilters}>
        <FilterX data-icon="inline-start" aria-hidden="true" />
        {m.clear_filters()}
      </Button>
    </div>
  {/if}

  {#if presentation.loading && !presentation.hasReport}
    <div class="large-blobs-inventory-toolbar large-blobs-toolbar-skeleton" aria-hidden="true">
      <Skeleton class="large-blobs-search-skeleton" />
      <Skeleton class="large-blobs-filter-skeleton" />
      <Skeleton class="large-blobs-action-skeleton" />
    </div>

    <div class="large-blobs-table-frame">
      <Table.Root
        class="large-blobs-table large-blobs-table-skeleton"
        aria-label={m.waiting_for_authenticator_response()}
        aria-busy="true"
      >
        {@render largeBlobsTableHeader()}
        <Table.Body>
          {#each SKELETON_ROWS as row (row)}
            <Table.Row class="large-blobs-table-row">
              <Table.Cell><Skeleton class="large-blobs-cell-skeleton" /></Table.Cell>
              <Table.Cell><Skeleton class="large-blobs-cell-skeleton" /></Table.Cell>
              <Table.Cell><Skeleton class="large-blobs-badge-skeleton" /></Table.Cell>
              <Table.Cell><Skeleton class="large-blobs-badge-skeleton" /></Table.Cell>
              <Table.Cell><Skeleton class="large-blobs-badge-skeleton" /></Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {:else if presentation.emptyInventory}
    <EmptyState
      title={m.no_resident_credentials_found()}
      message={m.no_resident_credentials_large_blob_message()}
      variant="compact"
    />
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
    <div class="large-blobs-table-frame">
      <Table.Root class="large-blobs-table" aria-label={m.blob_credentials()}>
        {@render largeBlobsTableHeader()}
        <Table.Body>
          {#each presentation.rows as row (row.id)}
            {@const selected = presentation.selectedCredentialID === row.id}
            {@const detailsID = credentialDetailsID(row.id)}
            <Table.Row
              class="large-blobs-table-row"
              aria-selected={selected}
              data-selected={selected ? "true" : undefined}
              data-open={selected ? "true" : undefined}
              data-blob-state={row.blobPresent ? "present" : "missing"}
              data-key-state={row.largeBlobKeyAvailable ? "available" : "unavailable"}
            >
              <Table.Cell>
                <span class="large-blobs-row-copy">
                  <strong>{row.rpName}</strong>
                  <code title={row.rpID}>{row.rpID}</code>
                </span>
              </Table.Cell>
              <Table.Cell class="large-blobs-table-user">
                <Button
                  variant="ghost"
                  size="sm"
                  class="large-blobs-row-trigger"
                  type="button"
                  aria-label={`${row.displayName}, ${row.userName}, ${row.rpName}`}
                  aria-expanded={selected}
                  aria-controls={detailsID}
                  title={selected ? m.close() : m.large_blob_details()}
                  disabled={selectionDisabled}
                  onclick={() => toggleCredential(row)}
                >
                  <span class="large-blobs-row-copy">
                    <strong>{row.displayName}</strong>
                    <span>{row.userName}</span>
                  </span>
                  <ChevronDown class="large-blobs-row-chevron" data-icon="inline-end" aria-hidden="true" />
                </Button>
              </Table.Cell>
              <Table.Cell class="large-blobs-table-state">
                <Badge variant={row.blobPresent ? "secondary" : "outline"}>{blobStateLabel(row)}</Badge>
              </Table.Cell>
              <Table.Cell class="large-blobs-table-bytes">
                <span>{row.blobPresent ? m.bytes_count({ count: row.blobByteCount }) : "—"}</span>
              </Table.Cell>
              <Table.Cell class="large-blobs-table-key">
                <Badge
                  variant="outline"
                  aria-label={keyStateLabel(row)}
                  title={keyStateLabel(row)}
                >
                  {compactKeyStateLabel(row)}
                </Badge>
              </Table.Cell>
            </Table.Row>
            {#if selected}
              <Table.Row id={detailsID} class="large-blobs-table-details" data-open="true">
                <Table.Cell class="large-blobs-table-details-cell" colspan={5}>
                  <LargeBlobInspector
                    {row}
                    {readState}
                    {decodeMode}
                    writeDisabled={presentation.writeDisabled}
                    deleteDisabled={presentation.deleteDisabled}
                    {onDecodeModeChange}
                    {onWrite}
                    {onDelete}
                  />
                </Table.Cell>
              </Table.Row>
            {/if}
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
</section>

<style>
@layer blocks {
  .large-blobs-inventory {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .large-blobs-inventory-toolbar {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) auto auto;
    gap: var(--space-2);
    align-items: end;
  }

  :global(.large-blobs-inventory-toolbar [data-slot="field"]) {
    min-width: 0;
  }

  :global(.large-blobs-inventory-toolbar [data-slot="select-trigger"]) {
    max-width: 18rem;
  }

  :global(.large-blobs-toolbar-skeleton [data-slot="skeleton"]) {
    height: 2rem;
  }

  :global(.large-blobs-search-skeleton) {
    width: 100%;
  }

  :global(.large-blobs-filter-skeleton) {
    width: 12rem;
  }

  :global(.large-blobs-action-skeleton) {
    width: 8rem;
  }

  .large-blobs-table-frame {
    min-width: 0;
    border: 1px solid var(--border);
  }

  :global(.large-blobs-table) {
    min-width: 52rem;
    table-layout: fixed;
  }

  :global(.large-blobs-table th:first-child),
  :global(.large-blobs-table-row > td:first-child) {
    width: 24%;
  }

  :global(.large-blobs-table th:nth-child(2)),
  :global(.large-blobs-table-row > td:nth-child(2)) {
    width: 30%;
  }

  :global(.large-blobs-table-state) {
    width: 16%;
  }

  :global(.large-blobs-table-bytes) {
    width: 12%;
  }

  :global(.large-blobs-table-key) {
    width: 18%;
    text-align: end;
  }

  .large-blobs-row-copy {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
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
  .large-blobs-row-copy code,
  :global(.large-blobs-table-bytes) {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  :global(.large-blobs-table-user) {
    padding: 0;
  }

  :global(.large-blobs-row-trigger) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    width: 100%;
    height: auto;
    min-width: 0;
    padding: var(--space-2);
    text-align: left;
  }

  :global(.large-blobs-row-chevron) {
    transition: transform 120ms ease;
  }

  :global(.large-blobs-cell-skeleton) {
    width: 78%;
    height: 0.75rem;
  }

  :global(.large-blobs-badge-skeleton) {
    width: 4.5rem;
    height: 1.25rem;
  }

  :global(.large-blobs-table-details-cell) {
    min-width: 0;
    overflow: hidden;
    padding: 0;
    white-space: normal;
  }

  @container workspace (max-width: 47.5rem) {
    .large-blobs-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    :global(.large-blobs-inventory-toolbar [data-slot="field"]),
    :global(.large-blobs-search-skeleton) {
      grid-column: 1 / -1;
    }
  }

  @container workspace (max-width: 38.75rem) {
    .large-blobs-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.large-blobs-inventory-toolbar [data-slot="field"]),
    :global(.large-blobs-search-skeleton) {
      grid-column: auto;
    }

    :global(.large-blobs-inventory-toolbar [data-slot="select-trigger"]),
    :global(.large-blobs-search-skeleton),
    :global(.large-blobs-filter-skeleton),
    :global(.large-blobs-action-skeleton) {
      width: 100%;
      max-width: none;
    }
  }
}

@layer exceptions {
  :global(.large-blobs-table-row[data-selected="true"]) {
    background: var(--muted);
  }

  :global(.large-blobs-table-row[data-open="true"] .large-blobs-row-chevron) {
    transform: rotate(180deg);
  }

  :global(.large-blobs-table-details[data-open="true"]) {
    background: var(--muted);
  }
}
</style>
