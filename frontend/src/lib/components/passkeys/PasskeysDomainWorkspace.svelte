<script lang="ts">
  import {
    ChevronRight,
    FlaskConical,
    KeyRound,
    Pencil,
    RefreshCw,
    Trash2,
    X,
  } from "@lucide/svelte";

  import PasskeyDirectoryReference from "$lib/components/passkeys/PasskeyDirectoryReference.svelte";
  import PasskeyInspector from "$lib/components/passkeys/PasskeyInspector.svelte";
  import CredentialInventoryToolbar from "$lib/components/shared/CredentialInventoryToolbar.svelte";
  import DetailNavigation from "$lib/components/shared/DetailNavigation.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as Sheet from "$lib/components/ui/sheet";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { PasskeyLargeBlobState } from "$lib/features/largeblobs/state";
  import { normalizedRPID, type PasskeysStatusFilter } from "$lib/features/passkeys/state";
  import type {
    PasskeyCredentialRow,
    PasskeyRelyingParty,
    PasskeysPresentation,
  } from "$lib/passkeys-presentation";

  import { m } from "../../../paraglide/messages.js";

  const DETAIL_SHEET_BREAKPOINT_PX = 52 * 16;

  type Props = {
    presentation: PasskeysPresentation;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: PasskeysStatusFilter) => void;
    onSelect: (credentialID: string) => void;
    onEdit: (credentialID: string) => void;
    onDelete: (credentialID: string) => void | Promise<boolean>;
    largeBlobState: PasskeyLargeBlobState;
    largeBlobDisabled: boolean;
    onLargeBlobCheck: (credentialID: string) => void | Promise<boolean>;
    onLargeBlobWrite: (credentialID: string) => void;
    onLargeBlobDelete: (credentialID: string) => void | Promise<boolean>;
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
    largeBlobState,
    largeBlobDisabled,
    onLargeBlobCheck,
    onLargeBlobWrite,
    onLargeBlobDelete,
    onOpenLab,
    onReload,
  }: Props = $props();

  let inventoryWidth = $state(0);
  let detailOpen = $state(false);
  let selectionBoundary: string | null = $state(null);
  let useDetailSheet = $derived(inventoryWidth > 0 && inventoryWidth <= DETAIL_SHEET_BREAKPOINT_PX);
  let selectedRelyingPartyIndex = $derived(
    presentation.selectedRelyingParty
      ? presentation.relyingParties.findIndex(
          (relyingParty) => relyingParty.id === presentation.selectedRelyingParty?.id,
        )
      : -1,
  );

  let filters = $derived([
    { value: "all" as const, label: m.passkeys_filter_all() },
    { value: "large-blob-available" as const, label: m.passkeys_filter_large_blob_available() },
    { value: "large-blob-missing" as const, label: m.passkeys_filter_large_blob_missing() },
    { value: "third-party-payment" as const, label: m.passkeys_filter_third_party_payment() },
    { value: "cred-protect-1" as const, label: m.passkeys_filter_cred_protect_1() },
    { value: "cred-protect-2" as const, label: m.passkeys_filter_cred_protect_2() },
    { value: "cred-protect-3" as const, label: m.passkeys_filter_cred_protect_3() },
    {
      value: "cred-protect-not-reported" as const,
      label: m.passkeys_filter_cred_protect_not_reported(),
    },
  ] satisfies { value: PasskeysStatusFilter; label: string }[]);

  function credentialCount(count: number) {
    return count === 1
      ? m.passkeys_credential_count_one()
      : m.passkeys_credential_count_many({ count });
  }

  function credentialsOnAuthenticator(count: number) {
    return count === 1
      ? m.passkeys_credentials_on_authenticator_one()
      : m.passkeys_credentials_on_authenticator_many({ count });
  }

  function hasDistinctRPName(rpID: string, rpName: string) {
    return normalizedRPID(rpName) !== normalizedRPID(rpID);
  }

  function clearFilters() {
    onQueryChange("");
    onFilterChange("all");
  }

  function openRelyingParty(credentialID: string) {
    onSelect(credentialID);
    if (useDetailSheet) detailOpen = true;
  }

  function selectRelyingPartyAt(index: number) {
    onSelect(presentation.relyingParties[index].credentials[0].id);
  }

  function editCredential(credentialID: string) {
    detailOpen = false;
    onEdit(credentialID);
  }

  function deleteCredential(credentialID: string) {
    detailOpen = false;
    return onDelete(credentialID);
  }

  function writeLargeBlob(credentialID: string) {
    detailOpen = false;
    onLargeBlobWrite(credentialID);
  }

  function deleteLargeBlob(credentialID: string) {
    detailOpen = false;
    return onLargeBlobDelete(credentialID);
  }

  $effect(() => {
    const selector = presentation.selector;

    if (selectionBoundary === null) {
      selectionBoundary = selector;
      return;
    }

    if (selector === selectionBoundary) return;

    selectionBoundary = selector;
    detailOpen = false;
  });

  $effect(() => {
    if (!useDetailSheet || !presentation.selectedRelyingParty || !presentation.selectedCredential) {
      detailOpen = false;
    }
  });
</script>

{#snippet relyingPartyNavigation()}
  <aside class="passkeys-rp-navigation" aria-label={m.passkeys_relying_parties_navigation()}>
    <header>
      <span>{m.passkeys_relying_parties_navigation()}</span>
      <Badge variant="outline">{presentation.relyingParties.length}</Badge>
    </header>

    <nav>
      {#each presentation.relyingParties as relyingParty (relyingParty.id)}
        {@const selected = relyingParty.id === presentation.selectedRelyingParty?.id}
        <Button
          class="passkeys-rp-button"
          variant="ghost"
          type="button"
          aria-current={selected ? "page" : undefined}
          data-selected={selected || undefined}
          onclick={() => openRelyingParty(relyingParty.credentials[0].id)}
        >
          <span>
            <strong>{relyingParty.rpID}</strong>
            {#if hasDistinctRPName(relyingParty.rpID, relyingParty.rpName)}
              <small>{relyingParty.rpName}</small>
            {/if}
            <small>{credentialCount(relyingParty.credentials.length)}</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </Button>
      {/each}
    </nav>
  </aside>
{/snippet}

{#snippet relyingPartyDetail(
  relyingParty: PasskeyRelyingParty,
  credential: PasskeyCredentialRow,
  inSheet: boolean,
)}
  {#if inSheet}
    <Sheet.Title class="sr-only">{relyingParty.rpName}</Sheet.Title>
    <Sheet.Description class="sr-only">
      {relyingParty.rpID}. {credentialsOnAuthenticator(relyingParty.credentials.length)}
    </Sheet.Description>
  {/if}

  <header class="passkeys-domain-heading">
    <div class="passkeys-domain-heading-copy">
      <span>{m.passkeys_relying_party()}</span>
      <h2>{relyingParty.rpName}</h2>
      <code>{relyingParty.rpID}</code>
      <small>{credentialsOnAuthenticator(relyingParty.credentials.length)}</small>
    </div>

    <Tooltip.Provider delayDuration={350}>
      <div class="passkeys-domain-actions">
        {#if presentation.report?.support.previewOnly}
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <span {...props} class="passkeys-domain-disabled-action">
                  <Button variant="outline" size="sm" type="button" disabled>
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                    {m.edit()}
                  </Button>
                </span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="top">{m.preview_only()}</Tooltip.Content>
          </Tooltip.Root>
        {:else}
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={presentation.updateDisabled}
            onclick={() => editCredential(credential.id)}
          >
            <Pencil data-icon="inline-start" aria-hidden="true" />
            {m.edit()}
          </Button>
        {/if}

        <Button
          variant="destructive"
          size="sm"
          type="button"
          disabled={presentation.deleteDisabled}
          onclick={() => deleteCredential(credential.id)}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          {m.delete()}
        </Button>
      </div>
    </Tooltip.Provider>
  </header>

  {#if relyingParty.directory}
    <PasskeyDirectoryReference rpID={relyingParty.rpID} match={relyingParty.directory} />
  {/if}

  <PasskeyInspector
    row={credential}
    credentials={relyingParty.credentials}
    {largeBlobState}
    {largeBlobDisabled}
    {onSelect}
    {onLargeBlobCheck}
    onLargeBlobWrite={writeLargeBlob}
    onLargeBlobDelete={deleteLargeBlob}
  />
{/snippet}

<section class="passkeys-domain-inventory" bind:clientWidth={inventoryWidth}>
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

    <div class="passkeys-domain-workspace passkeys-domain-skeleton" aria-busy="true">
      <aside>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </aside>
      <main>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </main>
    </div>
  {:else if presentation.emptyInventory}
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
  {:else if presentation.selectedRelyingParty && presentation.selectedCredential}
    <div class="passkeys-domain-workspace" data-layout={useDetailSheet ? "list" : "workspace"}>
      {@render relyingPartyNavigation()}

      {#if !useDetailSheet}
        <main class="passkeys-domain-main">
          {@render relyingPartyDetail(
            presentation.selectedRelyingParty,
            presentation.selectedCredential,
            false,
          )}
        </main>
      {/if}
    </div>

    {#if useDetailSheet}
      <Sheet.Root bind:open={detailOpen}>
        <Sheet.Content side="right" class="passkeys-detail-sheet" showCloseButton={false}>
          <div class="passkeys-detail-sheet-titlebar">
            <Sheet.Close>
              {#snippet child({ props })}
                <Button
                  {...props}
                  class="passkeys-detail-sheet-close"
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  aria-label={m.close()}
                >
                  <X aria-hidden="true" />
                </Button>
              {/snippet}
            </Sheet.Close>
          </div>

          <DetailNavigation
            navigationLabel={m.passkeys_relying_parties_navigation()}
            positionLabel={m.passkeys_relying_party_position({
              current: selectedRelyingPartyIndex + 1,
              total: presentation.relyingParties.length,
            })}
            previousLabel={m.passkeys_previous_relying_party()}
            nextLabel={m.passkeys_next_relying_party()}
            canPrevious={selectedRelyingPartyIndex > 0}
            canNext={selectedRelyingPartyIndex >= 0 &&
              selectedRelyingPartyIndex < presentation.relyingParties.length - 1}
            shortcutsEnabled={detailOpen}
            onPrevious={() => selectRelyingPartyAt(selectedRelyingPartyIndex - 1)}
            onNext={() => selectRelyingPartyAt(selectedRelyingPartyIndex + 1)}
          />

          <ScrollArea class="passkeys-detail-sheet-scroll">
            <div class="passkeys-domain-main" data-surface="sheet">
              {@render relyingPartyDetail(
                presentation.selectedRelyingParty,
                presentation.selectedCredential,
                true,
              )}
            </div>
          </ScrollArea>
        </Sheet.Content>
      </Sheet.Root>
    {/if}
  {/if}
</section>

<style>
  @layer blocks {
    .passkeys-domain-inventory,
    .passkeys-domain-workspace,
    .passkeys-rp-navigation,
    .passkeys-rp-navigation nav,
    .passkeys-domain-main,
    .passkeys-domain-heading,
    .passkeys-domain-heading-copy,
    .passkeys-domain-actions,
    :global(.passkeys-rp-button),
    :global(.passkeys-rp-button > span) {
      min-width: 0;
    }

    .passkeys-domain-inventory {
      display: grid;
      gap: var(--space-3);
    }

    .passkeys-domain-workspace {
      display: grid;
      grid-template-columns: minmax(14rem, 0.44fr) minmax(0, 1.56fr);
      border: 1px solid var(--data-table-border);
      background: var(--card);
    }

    .passkeys-rp-navigation {
      border-right: 1px solid var(--data-table-border);
      background: color-mix(in oklch, var(--muted) 46%, var(--card));
    }

    .passkeys-rp-navigation header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      border-bottom: 1px solid var(--data-table-border);
      padding: var(--space-3);
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .passkeys-rp-navigation nav {
      display: grid;
    }

    :global(.passkeys-rp-button) {
      display: flex;
      justify-content: space-between;
      width: 100%;
      height: auto;
      border-bottom: 1px solid var(--data-table-border);
      padding: var(--space-3);
      text-align: left;
    }

    :global(.passkeys-rp-button > span) {
      display: grid;
      flex: 1 1 auto;
      gap: 2px;
    }

    :global(.passkeys-rp-button strong),
    :global(.passkeys-rp-button small) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :global(.passkeys-rp-button strong) {
      font-size: 0.78rem;
    }

    :global(.passkeys-rp-button small) {
      color: var(--muted-foreground);
      font-size: 0.68rem;
      font-weight: 400;
    }

    :global(.passkeys-rp-button > svg) {
      width: 0.9rem;
      height: 0.9rem;
      color: var(--muted-foreground);
    }

    .passkeys-domain-main {
      position: sticky;
      top: var(--space-4);
      display: grid;
      align-self: start;
      align-content: start;
      background: var(--card);
    }

    :global(.passkeys-detail-sheet[data-side="right"]) {
      width: min(48rem, 100vw);
      max-width: none;
      container: workspace / inline-size;
    }

    :global(.passkeys-detail-sheet-scroll) {
      flex: 1 1 auto;
      min-height: 0;
    }

    .passkeys-detail-sheet-titlebar {
      --wails-non-client-region: caption;
      --wails-draggable: drag;
      display: flex;
      flex: 0 0 var(--shell-titlebar-block-size);
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
      border-bottom: 1px solid var(--border);
      padding: 0 var(--space-3);
      user-select: none;
    }

    :global(.passkeys-detail-sheet-close) {
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }

    .passkeys-domain-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-5);
    }

    .passkeys-domain-heading-copy {
      display: grid;
      flex: 1 1 18rem;
      gap: 2px;
    }

    .passkeys-domain-heading-copy > span {
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .passkeys-domain-heading-copy h2 {
      margin: 0;
      font-size: 1.05rem;
    }

    .passkeys-domain-heading-copy code,
    .passkeys-domain-heading-copy small {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .passkeys-domain-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }

    .passkeys-domain-disabled-action {
      display: inline-flex;
    }

    .passkeys-domain-skeleton aside,
    .passkeys-domain-skeleton main {
      display: grid;
      align-content: start;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .passkeys-domain-skeleton aside {
      border-right: 1px solid var(--data-table-border);
    }

    .passkeys-domain-skeleton :global([data-slot="skeleton"]) {
      height: 3rem;
    }

    .passkeys-domain-skeleton main :global([data-slot="skeleton"]:first-child) {
      width: 40%;
    }

    @container workspace (max-width: 52rem) {
      .passkeys-domain-skeleton {
        grid-template-columns: minmax(0, 1fr);
      }

      .passkeys-domain-skeleton aside {
        border-right: 0;
        border-bottom: 1px solid var(--data-table-border);
      }
    }

    @container workspace (max-width: 38rem) {
      .passkeys-domain-heading {
        padding-inline: var(--space-4);
      }

      .passkeys-domain-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  }

  @layer exceptions {
    .passkeys-domain-workspace[data-layout="list"] {
      grid-template-columns: minmax(0, 1fr);
    }

    .passkeys-domain-workspace[data-layout="list"] .passkeys-rp-navigation {
      border-right: 0;
    }

    .passkeys-domain-main[data-surface="sheet"] {
      position: static;
    }

    :global(.passkeys-rp-button[data-selected]) {
      background: var(--muted);
      box-shadow: inset 2px 0 var(--primary);
    }
  }
</style>
