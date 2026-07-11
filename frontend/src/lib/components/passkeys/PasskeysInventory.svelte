<script lang="ts">
  import { ChevronDown, FilterX } from "@lucide/svelte";

  import PasskeyInspector from "$lib/components/passkeys/PasskeyInspector.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { PasskeysMutationState, PasskeysStatusFilter } from "$lib/features/passkeys/state";
  import type { PasskeyCredentialRow, PasskeysPresentation } from "$lib/passkeys-presentation";

  import { m } from "../../../paraglide/messages.js";

  const SKELETON_ROWS = ["credential-1", "credential-2", "credential-3"] as const;

  type Props = {
    presentation: PasskeysPresentation;
    mutation: PasskeysMutationState;
    updateDisabled: boolean;
    deleteDisabled: boolean;
    previewOnly: boolean;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: PasskeysStatusFilter) => void;
    onSelect: (credentialID: string) => void;
    onEdit: (credentialID: string) => void;
    onDelete: (credentialID: string) => void | Promise<boolean>;
  };

  let {
    presentation,
    mutation,
    updateDisabled,
    deleteDisabled,
    previewOnly,
    onQueryChange,
    onFilterChange,
    onSelect,
    onEdit,
    onDelete,
  }: Props = $props();

  let filters = $derived([
    { value: "all" as const, label: m.passkeys_filter_all() },
    { value: "large-blob-available" as const, label: m.passkeys_filter_large_blob_available() },
    { value: "large-blob-missing" as const, label: m.passkeys_filter_large_blob_missing() },
    { value: "third-party-payment" as const, label: m.passkeys_filter_third_party_payment() },
    { value: "cred-protect-1" as const, label: m.passkeys_filter_cred_protect_1() },
    { value: "cred-protect-2" as const, label: m.passkeys_filter_cred_protect_2() },
    { value: "cred-protect-3" as const, label: m.passkeys_filter_cred_protect_3() },
    { value: "cred-protect-not-reported" as const, label: m.passkeys_filter_cred_protect_not_reported() },
  ] satisfies { value: PasskeysStatusFilter; label: string }[]);

  let currentFilterLabel = $derived(
    filters.find((filter) => filter.value === presentation.statusFilter)?.label ?? m.passkeys_filter_all(),
  );
  let filtersActive = $derived(Boolean(presentation.query.trim()) || presentation.statusFilter !== "all");

  function handleFilterChange(value: string | string[]) {
    if (Array.isArray(value)) return;
    const selected = filters.find((filter) => filter.value === value);
    if (selected) onFilterChange(selected.value);
  }

  function clearFilters() {
    onQueryChange("");
    onFilterChange("all");
  }

  function credentialDetailsID(credentialID: string) {
    return `passkey-row-details-${credentialID}`;
  }

  function credProtectLabel(row: PasskeyCredentialRow) {
    if (row.credProtectLevel === 1) return m.cred_protect_level_1();
    if (row.credProtectLevel === 2) return m.cred_protect_level_2();
    if (row.credProtectLevel === 3) return m.cred_protect_level_3();
    return m.cred_protect_not_reported();
  }

  function compactCredProtectLabel(row: PasskeyCredentialRow) {
    return row.credProtectLevel ? `UV ${row.credProtectLevel}` : "UV —";
  }

  function toggleCredential(row: PasskeyCredentialRow) {
    onSelect(presentation.selectedCredentialID === row.id ? "" : row.id);
  }
</script>

{#snippet passkeysTableHeader()}
  <Table.Header>
    <Table.Row>
      <Table.Head scope="col">{m.rp_name()}</Table.Head>
      <Table.Head scope="col">{m.user_name()}</Table.Head>
      <Table.Head scope="col" class="passkeys-table-credential">{m.credential_id()}</Table.Head>
      <Table.Head scope="col" class="passkeys-table-protection">UV</Table.Head>
    </Table.Row>
  </Table.Header>
{/snippet}

<section class="passkeys-inventory">
  {#if presentation.hasReport && !presentation.emptyInventory}
    <div class="passkeys-inventory-toolbar">
      <Field.Field>
        <Field.FieldLabel class="sr-only" for="passkeys-search">
          {m.passkeys_search_placeholder()}
        </Field.FieldLabel>
        <Input
          id="passkeys-search"
          type="search"
          value={presentation.query}
          placeholder={m.passkeys_search_placeholder()}
          autocomplete="off"
          oninput={(event) => onQueryChange(event.currentTarget.value)}
        />
      </Field.Field>

      <Select.Root
        type="single"
        value={presentation.statusFilter}
        onValueChange={handleFilterChange}
        items={filters}
      >
        <Select.Trigger aria-label={m.status()}>{currentFilterLabel}</Select.Trigger>
        <Select.Portal>
          <Select.Content side="bottom" align="end" sideOffset={6}>
            <Select.Group>
              {#each filters as filter (filter.value)}
                <Select.Item value={filter.value} label={filter.label}>{filter.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <Button
        variant="outline"
        type="button"
        disabled={!filtersActive}
        onclick={clearFilters}
      >
        <FilterX data-icon="inline-start" aria-hidden="true" />
        {m.clear_filters()}
      </Button>
    </div>
  {/if}

  {#if presentation.loading && !presentation.hasReport}
    <div class="passkeys-inventory-toolbar passkeys-inventory-toolbar-skeleton" aria-hidden="true">
      <Skeleton class="passkeys-toolbar-search-skeleton" />
      <Skeleton class="passkeys-toolbar-filter-skeleton" />
      <Skeleton class="passkeys-toolbar-action-skeleton" />
    </div>

    <div class="passkeys-table-frame">
      <Table.Root
        class="passkeys-table passkeys-table-skeleton"
        aria-label={m.waiting_for_authenticator_response()}
        aria-busy="true"
      >
        {@render passkeysTableHeader()}
        <Table.Body>
          {#each SKELETON_ROWS as row (row)}
            <Table.Row class="passkeys-table-row">
              <Table.Cell>
                <div class="passkeys-skeleton-copy">
                  <Skeleton class="passkeys-skeleton-primary" />
                  <Skeleton class="passkeys-skeleton-secondary" />
                </div>
              </Table.Cell>
              <Table.Cell class="passkeys-table-user">
                <div class="passkeys-skeleton-user">
                  <div class="passkeys-skeleton-copy">
                    <Skeleton class="passkeys-skeleton-primary" />
                    <Skeleton class="passkeys-skeleton-secondary" />
                  </div>
                  <Skeleton class="passkeys-skeleton-icon" />
                </div>
              </Table.Cell>
              <Table.Cell class="passkeys-table-credential">
                <Skeleton class="passkeys-skeleton-credential" />
              </Table.Cell>
              <Table.Cell class="passkeys-table-protection">
                <Skeleton class="passkeys-skeleton-badge" />
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {:else if presentation.emptyInventory}
    <EmptyState
      title={m.no_passkeys_found()}
      message={m.no_passkeys_found_message()}
      variant="compact"
    />
  {:else if presentation.emptyFilteredResult}
    <EmptyState
      title={m.passkeys_no_filtered_results_title()}
      message={m.passkeys_no_filtered_results_message()}
      variant="compact"
    >
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={clearFilters}>{m.clear_filters()}</Button>
      {/snippet}
    </EmptyState>
  {:else if presentation.hasReport}
    <div class="passkeys-table-frame">
      <Table.Root class="passkeys-table" aria-label={m.resident_credentials()}>
        {@render passkeysTableHeader()}
        <Table.Body>
          {#each presentation.rows as row (row.id)}
            {@const selected = presentation.selectedCredentialID === row.id}
            {@const detailsID = credentialDetailsID(row.id)}
            <Table.Row
              class="passkeys-table-row"
              aria-selected={selected}
              data-selected={selected ? "true" : undefined}
              data-open={selected ? "true" : undefined}
            >
              <Table.Cell>
                <span class="passkeys-row-copy">
                  <strong>{row.rpName}</strong>
                  <code title={row.rpID}>{row.rpID}</code>
                </span>
              </Table.Cell>
              <Table.Cell class="passkeys-table-user">
                <Button
                  variant="ghost"
                  size="sm"
                  class="passkeys-row-trigger"
                  type="button"
                  aria-label={`${row.displayName}, ${row.userName}, ${row.rpName}`}
                  aria-expanded={selected}
                  aria-controls={detailsID}
                  title={selected ? m.close() : m.passkey_details()}
                  onclick={() => toggleCredential(row)}
                >
                  <span class="passkeys-row-copy">
                    <strong>{row.displayName}</strong>
                    <span>{row.userName}</span>
                  </span>
                  <ChevronDown
                    class="passkeys-row-chevron"
                    data-icon="inline-end"
                    aria-hidden="true"
                  />
                </Button>
              </Table.Cell>
              <Table.Cell class="passkeys-table-credential">
                <code
                  class="passkeys-row-credential"
                  title={row.credentialIDHex}
                >
                  {row.credentialIDHex}
                </code>
              </Table.Cell>
              <Table.Cell class="passkeys-table-protection">
                <Badge
                  variant="outline"
                  aria-label={credProtectLabel(row)}
                  title={credProtectLabel(row)}
                >
                  {compactCredProtectLabel(row)}
                </Badge>
              </Table.Cell>
            </Table.Row>
            {#if selected}
              <Table.Row
                id={detailsID}
                class="passkeys-table-details"
                data-open="true"
              >
                <Table.Cell class="passkeys-table-details-cell" colspan={4}>
                  <PasskeyInspector
                    {row}
                    {mutation}
                    {updateDisabled}
                    {deleteDisabled}
                    {previewOnly}
                    {onEdit}
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
  .passkeys-inventory {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .passkeys-inventory-toolbar {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) auto auto;
    gap: var(--space-2);
    align-items: end;
  }

  :global(.passkeys-inventory-toolbar [data-slot="field"]) {
    min-width: 0;
  }

  :global(.passkeys-inventory-toolbar [data-slot="select-trigger"]) {
    max-width: 18rem;
  }

  :global(.passkeys-inventory-toolbar-skeleton [data-slot="skeleton"]) {
    height: 2rem;
  }

  :global(.passkeys-toolbar-search-skeleton) {
    width: 100%;
  }

  :global(.passkeys-toolbar-filter-skeleton) {
    width: 14rem;
  }

  :global(.passkeys-toolbar-action-skeleton) {
    width: 8rem;
  }

  .passkeys-table-frame {
    min-width: 0;
    border: 1px solid var(--border);
  }

  :global(.passkeys-table) {
    min-width: 42rem;
    table-layout: fixed;
  }

  :global(.passkeys-table th:first-child),
  :global(.passkeys-table-row > td:first-child) {
    width: 27%;
  }

  :global(.passkeys-table th:nth-child(2)),
  :global(.passkeys-table-row > td:nth-child(2)) {
    width: 39%;
  }

  :global(.passkeys-table-credential) {
    width: 24%;
  }

  :global(.passkeys-table-protection) {
    width: 10%;
    text-align: end;
  }

  .passkeys-row-copy {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
  }

  .passkeys-row-copy strong,
  .passkeys-row-copy span,
  .passkeys-row-copy code {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .passkeys-row-copy span,
  .passkeys-row-copy code,
  :global(.passkeys-row-credential) {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  :global(.passkeys-table-user) {
    padding: 0;
  }

  .passkeys-skeleton-user {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2);
  }

  .passkeys-skeleton-copy {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  :global(.passkeys-skeleton-primary) {
    width: 68%;
    height: 0.75rem;
  }

  :global(.passkeys-skeleton-secondary) {
    width: 86%;
    height: 0.6rem;
  }

  :global(.passkeys-skeleton-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.passkeys-skeleton-credential) {
    width: 82%;
    height: 0.75rem;
  }

  :global(.passkeys-skeleton-badge) {
    width: 2.75rem;
    height: 1.25rem;
    margin-left: auto;
  }

  :global(.passkeys-row-trigger) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    width: 100%;
    height: auto;
    min-width: 0;
    padding: var(--space-2);
    text-align: left;
  }

  :global(.passkeys-row-chevron) {
    transition: transform 120ms ease;
  }

  :global(.passkeys-row-credential) {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.passkeys-table-details-cell) {
    padding: 0;
    white-space: normal;
  }

  @media (max-width: 760px) {
    .passkeys-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    :global(.passkeys-inventory-toolbar [data-slot="field"]) {
      grid-column: 1 / -1;
    }

    :global(.passkeys-toolbar-search-skeleton) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 720px) {
    :global(.passkeys-table) {
      min-width: 28rem;
    }

    :global(.passkeys-table-credential),
    :global(.passkeys-table-protection) {
      display: none;
    }

    :global(.passkeys-table th:first-child),
    :global(.passkeys-table-row > td:first-child),
    :global(.passkeys-table th:nth-child(2)),
    :global(.passkeys-table-row > td:nth-child(2)) {
      width: 50%;
    }
  }

  @media (max-width: 520px) {
    .passkeys-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.passkeys-inventory-toolbar [data-slot="field"]) {
      grid-column: auto;
    }

    :global(.passkeys-inventory-toolbar [data-slot="select-trigger"]) {
      width: 100%;
      max-width: none;
    }

    :global(.passkeys-toolbar-search-skeleton),
    :global(.passkeys-toolbar-filter-skeleton),
    :global(.passkeys-toolbar-action-skeleton) {
      width: 100%;
    }
  }
}

@layer exceptions {
  :global(.passkeys-table-row[data-selected="true"]) {
    background: var(--muted);
  }

  :global(.passkeys-table-row[data-open="true"] .passkeys-row-chevron) {
    transform: rotate(180deg);
  }

  :global(.passkeys-table-details[data-open="true"]) {
    background: var(--muted);
  }
}
</style>
