<script lang="ts">
  import { ChevronRight, FlaskConical, KeyRound, RefreshCw } from "@lucide/svelte";

  import PasskeyInspector from "$lib/components/passkeys/PasskeyInspector.svelte";
  import CredentialInventoryToolbar from "$lib/components/shared/CredentialInventoryToolbar.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as ExpandableDataTable from "$lib/components/shared/expandable-data-table/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import type { PasskeysStatusFilter } from "$lib/features/passkeys/state";
  import type { PasskeyCredentialRow, PasskeysPresentation } from "$lib/passkeys-presentation";

  import { m } from "../../../paraglide/messages.js";

  const SKELETON_ROWS = ["credential-1", "credential-2", "credential-3"] as const;

  type Props = {
    presentation: PasskeysPresentation;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: PasskeysStatusFilter) => void;
    onSelect: (credentialID: string) => void;
    onEdit: (credentialID: string) => void;
    onDelete: (credentialID: string) => void | Promise<boolean>;
    onOpenLab: () => void;
    onReload: () => void | Promise<boolean>;
  };

  let {
    presentation,
    onQueryChange,
    onFilterChange,
    onSelect,
    onEdit,
    onDelete,
    onOpenLab,
    onReload,
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

  function clearFilters() {
    onQueryChange("");
    onFilterChange("all");
  }

  function credentialDetailsID(credentialID: string) {
    return `passkey-row-details-${credentialID}`;
  }

  function compactCredProtectLabel(row: PasskeyCredentialRow) {
    return row.credProtectLevel ? `UV ${row.credProtectLevel}` : "UV —";
  }
</script>

{#snippet passkeysTableHeader()}
  <th scope="col">{m.rp_name()}</th>
  <th scope="col">{m.user_name()}</th>
  <th scope="col" class="passkeys-table-credential">{m.credential_id()}</th>
  <th scope="col" class="passkeys-table-protection">UV</th>
{/snippet}

<section class="passkeys-inventory">
  {#if presentation.hasReport && !presentation.emptyInventory}
    <CredentialInventoryToolbar
      id="passkeys-search"
      query={presentation.query}
      statusFilter={presentation.statusFilter}
      {filters}
      searchPlaceholder={m.passkeys_search_placeholder()}
      {onQueryChange}
      {onFilterChange}
    />
  {/if}

  {#if presentation.loading && !presentation.hasReport}
    <CredentialInventoryToolbar
      id="passkeys-search"
      query={presentation.query}
      statusFilter={presentation.statusFilter}
      {filters}
      searchPlaceholder={m.passkeys_search_placeholder()}
      loading
      {onQueryChange}
      {onFilterChange}
    />

    <ExpandableDataTable.Root
      class="passkeys-table passkeys-table-skeleton"
      aria-label={m.waiting_for_authenticator_response()}
      aria-busy="true"
      header={passkeysTableHeader}
    >
      {#each SKELETON_ROWS as row (row)}
        <tr data-slot="expandable-data-table-summary-row">
          <td>
            <div class="passkeys-skeleton-copy">
              <Skeleton class="passkeys-skeleton-primary" />
              <Skeleton class="passkeys-skeleton-secondary" />
            </div>
          </td>
          <td>
            <div class="passkeys-skeleton-user">
              <div class="passkeys-skeleton-copy">
                <Skeleton class="passkeys-skeleton-primary" />
                <Skeleton class="passkeys-skeleton-secondary" />
              </div>
              <Skeleton class="passkeys-skeleton-icon" />
            </div>
          </td>
          <td class="passkeys-table-credential">
            <Skeleton class="passkeys-skeleton-credential" />
          </td>
          <td class="passkeys-table-protection">
            <Skeleton class="passkeys-skeleton-badge" />
          </td>
        </tr>
      {/each}
    </ExpandableDataTable.Root>
  {:else if presentation.emptyInventory}
    <ExpandableDataTable.Root
      class="passkeys-table"
      aria-label={m.resident_credentials()}
      header={passkeysTableHeader}
    >
      <tr class="passkeys-empty-row">
        <td colspan="4">
          <EmptyState
            title={m.passkeys_empty_title()}
            message={m.passkeys_empty_message()}
            variant="compact"
          >
            {#snippet icon()}<KeyRound aria-hidden="true" />{/snippet}
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
      title={m.passkeys_no_filtered_results_title()}
      message={m.passkeys_no_filtered_results_message()}
      variant="compact"
    >
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={clearFilters}>{m.clear_filters()}</Button>
      {/snippet}
    </EmptyState>
  {:else if presentation.hasReport}
    <ExpandableDataTable.Root
      class="passkeys-table"
      aria-label={m.resident_credentials()}
      header={passkeysTableHeader}
    >
      {#each presentation.rows as row (row.id)}
        {@const selected = presentation.selectedCredentialID === row.id}
        <ExpandableDataTable.Row
          detailsId={credentialDetailsID(row.id)}
          open={selected}
          disabled={false}
          columnCount={4}
          onOpenChange={(open) => onSelect(open ? row.id : "")}
        >
          {#snippet summary(triggerProps)}
            <td>
              <div class="passkeys-row-primary">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label={`${row.displayName}, ${row.userName}, ${row.rpName}`}
                  title={selected ? m.close() : m.passkey_details()}
                  {...triggerProps}
                >
                  <ChevronRight
                    class="passkeys-row-chevron"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                </Button>
                <span class="passkeys-row-copy">
                  <strong>{row.rpName}</strong>
                  <code title={row.rpID}>{row.rpID}</code>
                </span>
              </div>
            </td>
            <td>
              <span class="passkeys-row-copy">
                <strong>{row.displayName}</strong>
                <span title={row.userName}>{row.userName}</span>
              </span>
            </td>
            <td class="passkeys-table-credential">
              <code
                class="passkeys-row-credential"
                title={row.credentialIDHex}
              >
                {row.credentialIDHex}
              </code>
            </td>
            <td class="passkeys-table-protection">
              <Badge
                variant="outline"
                aria-label={row.credProtect}
                title={row.credProtect}
              >
                {compactCredProtectLabel(row)}
              </Badge>
            </td>
          {/snippet}
          {#snippet details()}
            <PasskeyInspector
              {row}
              updateDisabled={presentation.updateDisabled}
              deleteDisabled={presentation.deleteDisabled}
              previewOnly={Boolean(presentation.report?.support.previewOnly)}
              {onEdit}
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
  .passkeys-inventory {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  :global(.passkeys-table) {
    min-width: 42rem;
    table-layout: fixed;
  }

  :global(.passkeys-empty-row > td) {
    padding: 0;
    white-space: normal;
  }

  :global(.passkeys-table th:first-child),
  :global(.passkeys-table [data-slot="expandable-data-table-summary-row"] > td:first-child) {
    width: 27%;
  }

  :global(.passkeys-table th:nth-child(2)),
  :global(.passkeys-table [data-slot="expandable-data-table-summary-row"] > td:nth-child(2)) {
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

  .passkeys-row-primary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
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

  @container workspace (max-width: 45rem) {
    :global(.passkeys-table) {
      min-width: 28rem;
    }

    :global(.passkeys-table-credential),
    :global(.passkeys-table-protection) {
      display: none;
    }

    :global(.passkeys-table th:first-child),
    :global(.passkeys-table [data-slot="expandable-data-table-summary-row"] > td:first-child),
    :global(.passkeys-table th:nth-child(2)),
    :global(.passkeys-table [data-slot="expandable-data-table-summary-row"] > td:nth-child(2)) {
      width: 50%;
    }
  }

}

@layer exceptions {
  :global(.passkeys-table [data-slot="expandable-data-table-summary-row"][data-open="true"] .passkeys-row-chevron) {
    transform: rotate(90deg);
  }
}
</style>
