<script lang="ts">
  import { KeyRound } from "@lucide/svelte";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { loadPasskeys } from "$lib/controller";
  import { buildPasskeysPresentation } from "$lib/passkeys-presentation";
  import {
    passkeysEnvelope,
    passkeysInventory,
    passkeysLoading,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    sessionStatus,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let selectedRowId = $state("");
  let passkeys = $derived(buildPasskeysPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    sessionStatus: $sessionStatus,
    sessionBusy: $sessionBusy,
    envelope: $passkeysEnvelope,
    inventoryState: $passkeysInventory,
    loading: $passkeysLoading,
    selectedRowId,
  }));

  function reloadPasskeys() {
    return loadPasskeys(passkeys.selector);
  }

  function selectRow(rowId: string) {
    selectedRowId = rowId;
  }

  function handleRowKeydown(event: KeyboardEvent, rowId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectRow(rowId);
  }
</script>

{#if !passkeys.selector}
  <EmptyState title={m.select_authenticator()} message={m.select_authenticator_for_credentials()} />
{:else if !passkeys.hasReport && !passkeys.loading && !passkeys.failureMessage}
  <EmptyState title={m.passkeys_not_loaded()} message={m.passkeys_not_loaded_message()}>
    {#snippet icon()}
      <KeyRound size={34} strokeWidth={1.8} />
    {/snippet}
  </EmptyState>
{:else}
  <section class="passkeys-screen flow" aria-labelledby="passkeys-title">
    {#if passkeys.failureMessage}
      <div class="passkeys-alert" role="alert">{passkeys.failureMessage}</div>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title><h1 id="passkeys-title">{m.passkeys()}</h1></Card.Title>
        <Card.Description>{m.passkeys_description()}</Card.Description>
        <Card.Action>
          <Button variant="outline" type="button" onclick={reloadPasskeys} disabled={passkeys.reloadDisabled}>
            {passkeys.loading ? m.reloading_credentials() : m.reload_credentials()}
          </Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <div class="passkeys-summary-grid">
          {#each passkeys.summaryItems as item (item.label)}
            <div class="summary-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          {/each}
        </div>
        <div class="passkeys-support cluster" aria-label={m.support_mode()}>
          {#each passkeys.supportItems as item (item.label)}
            <StatusBadge value={item.value} label={item.label} tone={item.value ? "ok" : "neutral"} />
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    {#if passkeys.loading && !passkeys.hasReport}
      <Card.Root>
        <Card.Header>
          <Card.Title>{m.credential_inventory()}</Card.Title>
          <Card.Description>{m.waiting_for_authenticator_response()}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each passkeys.loadingRows as row (row)}
                <Table.Row>
                  <Table.Cell class="loading-label">{row}</Table.Cell>
                  <Table.Cell><Skeleton class="passkeys-skeleton" /></Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {:else if passkeys.emptyInventory}
      <EmptyState title={m.no_passkeys_found()} message={m.no_passkeys_found_message()} />
    {:else if passkeys.hasReport}
      <div class="passkeys-content-grid">
        <Card.Root class="passkeys-table-card">
          <Card.Header>
            <Card.Title>{m.resident_credentials()}</Card.Title>
            <Card.Description>{m.grouped_by_relying_party()}</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="table-frame">
              <Table.Root class="passkeys-table">
                <Table.Header>
                  <Table.Row>
                    <Table.Head>{m.relying_parties()}</Table.Head>
                    <Table.Head>{m.user_name()}</Table.Head>
                    <Table.Head>{m.display_name()}</Table.Head>
                    <Table.Head>{m.credential_id()}</Table.Head>
                    <Table.Head>{m.transport()}</Table.Head>
                    <Table.Head>{m.status()}</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each passkeys.rows as row (row.id)}
                    <Table.Row
                      class="passkeys-selectable-row"
                      data-selected={passkeys.selectedRow?.id === row.id ? "true" : undefined}
                      data-state={passkeys.selectedRow?.id === row.id ? "selected" : undefined}
                      aria-selected={passkeys.selectedRow?.id === row.id}
                      tabindex={0}
                      onclick={() => selectRow(row.id)}
                      onkeydown={(event) => handleRowKeydown(event, row.id)}
                    >
                      <Table.Cell>
                        <strong>{row.rpName}</strong>
                        <small>{row.rpIDHashHex}</small>
                      </Table.Cell>
                      <Table.Cell>{row.userName}</Table.Cell>
                      <Table.Cell>{row.displayName}</Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="ghost"
                          type="button"
                          class="credential-id-button"
                          data-selected={passkeys.selectedRow?.id === row.id ? "true" : undefined}
                          onclick={() => selectRow(row.id)}
                        >
                          <span>{row.credentialIDHex}</span>
                        </Button>
                      </Table.Cell>
                      <Table.Cell>{row.credentialTransports}</Table.Cell>
                      <Table.Cell>
                        <div class="status-stack">
                          <StatusBadge value={row.largeBlobKeyState} label={row.largeBlobKeyState} tone="neutral" />
                          {#if row.thirdPartyPayment !== m.not_reported()}
                            <StatusBadge value={row.thirdPartyPayment} label={m.third_party_payment()} tone="neutral" />
                          {/if}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </Card.Content>
        </Card.Root>

        <Card.Root class="passkeys-detail-card">
          <Card.Header>
            <Card.Title>{m.passkey_details()}</Card.Title>
            <Card.Description>{passkeys.selectedRow ? passkeys.selectedRow.rpName : m.select_row_to_open_inspector()}</Card.Description>
          </Card.Header>
          <Card.Content>
            {#if passkeys.selectedRow}
              <div class="credential-detail-list">
                <div>
                  <span>{m.credential_id()}</span>
                  <strong>{passkeys.selectedRow.credentialIDHex}</strong>
                </div>
                <div>
                  <span>{m.user_id_hex()}</span>
                  <strong>{passkeys.selectedRow.userIDHex}</strong>
                </div>
                <div>
                  <span>{m.credential_type()}</span>
                  <strong>{passkeys.selectedRow.credentialType}</strong>
                </div>
                <div>
                  <span>{m.credential_protection()}</span>
                  <strong>{passkeys.selectedRow.credProtect}</strong>
                </div>
              </div>
              <JsonView value={passkeys.selectedRow.raw} title={m.raw_credential_details()} variant="bare" />
            {:else}
              <EmptyState title={m.selected_credential()} message={m.select_row_to_open_inspector()} variant="compact" />
            {/if}
          </Card.Content>
        </Card.Root>
      </div>
    {/if}
  </section>
{/if}

<style>
@layer blocks {
  .passkeys-screen {
    min-width: 0;
    --flow-space: var(--space-4);
  }

  .passkeys-alert {
    border: 1px solid color-mix(in srgb, var(--destructive) 34%, var(--border));
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--destructive) 10%, var(--background));
    color: var(--destructive);
    padding: var(--space-3) var(--space-4);
  }

  :global(.passkeys-screen [data-slot="card-title"] h1) {
    margin: 0;
    font: inherit;
  }

  .passkeys-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
  }

  .summary-item {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .summary-item span,
  .credential-detail-list span {
    color: var(--muted-foreground);
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .summary-item strong,
  .credential-detail-list strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .passkeys-support {
    margin-top: var(--space-3);
    --cluster-space: var(--space-2);
  }

  .passkeys-content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 0.75fr);
    gap: var(--space-4);
    align-items: start;
    min-width: 0;
  }

  :global(.passkeys-table-card),
  :global(.passkeys-detail-card) {
    min-width: 0;
  }

  .table-frame {
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
  }

  :global(.passkeys-table) {
    min-width: 58rem;
  }

  :global(.passkeys-table tr[data-selected="true"]) {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }

  :global(.passkeys-selectable-row) {
    cursor: pointer;
  }

  :global(.passkeys-selectable-row:focus-visible) {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
  }

  :global(.passkeys-table small) {
    display: block;
    margin-top: var(--space-1);
    color: var(--muted-foreground);
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
  }

  :global(.credential-id-button) {
    max-width: 13rem;
    justify-content: flex-start;
    font-family: var(--font-mono);
  }

  :global(.credential-id-button span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.credential-id-button[data-selected="true"]) {
    border-color: var(--border);
    background: var(--muted);
  }

  .status-stack,
  .credential-detail-list {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .credential-detail-list {
    margin-bottom: var(--space-4);
  }

  :global(.loading-label) {
    color: var(--muted-foreground);
  }

  :global(.passkeys-skeleton) {
    width: 8rem;
    height: 1rem;
  }

  @media (max-width: 1120px) {
    .passkeys-content-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 820px) {
    .passkeys-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .passkeys-summary-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
