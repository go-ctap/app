<script lang="ts">
  import { KeyRound, RefreshCw, TriangleAlert } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import PasskeyDeleteDialog from "$lib/components/passkeys/PasskeyDeleteDialog.svelte";
  import PasskeysInventory from "$lib/components/passkeys/PasskeysInventory.svelte";
  import PasskeysOverview from "$lib/components/passkeys/PasskeysOverview.svelte";
  import PasskeyUpdateDialog from "$lib/components/passkeys/PasskeyUpdateDialog.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    beginCredentialDelete,
    beginCredentialUpdate,
    closePasskeysMutation,
    confirmCredentialDelete,
    confirmCredentialUpdate,
    editCredentialUpdate,
    previewCredentialUpdate,
    reloadPasskeys,
    retryPasskeysMutation,
    selectPasskeyCredential,
    setPasskeysQuery,
    setPasskeysStatusFilter,
    setPasskeysVerificationFlow,
    updateCredentialDraft,
  } from "$lib/controller";
  import { buildPasskeysPresentation, canRetryPasskeysMutation } from "$lib/passkeys-presentation";
  import {
    passkeysInventoryState,
    passkeysMutation,
    passkeysQuery,
    passkeysSelectedCredentialID,
    passkeysStatusFilter,
    passkeysVerificationFlow,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    sessionStatus,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let passkeys = $derived(buildPasskeysPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    sessionBusy: $sessionBusy,
    sessionReady: $sessionStatus.state === "ready" && Boolean($sessionStatus.sessionId),
    inventoryState: $passkeysInventoryState,
    query: $passkeysQuery,
    statusFilter: $passkeysStatusFilter,
    selectedCredentialID: $passkeysSelectedCredentialID,
  }));
  let mutationRetryAllowed = $derived(canRetryPasskeysMutation($passkeysMutation, $sessionStatus));

  async function handleReload() {
    const refreshed = await reloadPasskeys();
    if (refreshed) toast.success(m.credential_inventory_reloaded());
    return refreshed;
  }

  async function handleConfirmUpdate() {
    const succeeded = await confirmCredentialUpdate();
    if (succeeded) toast.success(m.credential_updated());
    return succeeded;
  }

  async function handleConfirmDelete() {
    const succeeded = await confirmCredentialDelete();
    if (succeeded) toast.success(m.credential_deleted());
    return succeeded;
  }
</script>

{#if !passkeys.selector}
  <EmptyState title={m.select_authenticator()} message={m.select_authenticator_for_credentials()} />
{:else}
  <section class="passkeys-screen" aria-labelledby="passkeys-title">
    <PasskeysOverview
      presentation={passkeys}
      verificationFlow={$passkeysVerificationFlow}
      onReload={handleReload}
      onVerificationFlowChange={setPasskeysVerificationFlow}
    />

    {#if passkeys.stale}
      <Alert.Root variant="warning" role="alert" class="passkeys-state-alert" data-state="stale">
        <TriangleAlert aria-hidden="true" />
        <Alert.Title>{m.passkeys_stale_title()}</Alert.Title>
        <Alert.Description>{m.passkeys_stale_message()}</Alert.Description>
        <Alert.Action>
          <Button variant="outline" size="sm" type="button" disabled={passkeys.reloadDisabled} onclick={handleReload}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {m.retry()}
          </Button>
        </Alert.Action>
      </Alert.Root>
    {:else if passkeys.canceled && passkeys.failureMessage}
      <Alert.Root role="status" class="passkeys-state-alert" data-state="canceled">
        <Alert.Title>{m.operation_canceled_with_label({ label: m.credential_inventory() })}</Alert.Title>
        <Alert.Description>{passkeys.failureMessage}</Alert.Description>
      </Alert.Root>
    {:else if passkeys.failureMessage && !passkeys.unsupported}
      <Alert.Root variant="destructive" role="alert" class="passkeys-state-alert" data-state="error">
        <TriangleAlert aria-hidden="true" />
        <Alert.Title>{m.operation_failed()}</Alert.Title>
        <Alert.Description>{passkeys.failureMessage}</Alert.Description>
        <Alert.Action>
          <Button variant="outline" size="sm" type="button" disabled={passkeys.reloadDisabled} onclick={handleReload}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {m.retry()}
          </Button>
        </Alert.Action>
      </Alert.Root>
    {/if}

    {#if passkeys.unsupported}
      <EmptyState
        title={m.passkeys_unsupported_title()}
        message={m.passkeys_unsupported_message()}
        variant="compact"
      >
        {#snippet icon()}<KeyRound aria-hidden="true" />{/snippet}
      </EmptyState>
    {:else if !passkeys.hasReport && !passkeys.loading}
      <EmptyState
        title={m.passkeys_not_loaded()}
        message={m.passkeys_not_loaded_message()}
        variant="compact"
      >
        {#snippet icon()}<KeyRound aria-hidden="true" />{/snippet}
        {#snippet actions()}
          <Button type="button" disabled={passkeys.reloadDisabled} onclick={handleReload}>
            {m.load_credentials()}
          </Button>
        {/snippet}
      </EmptyState>
    {:else}
      <PasskeysInventory
        presentation={passkeys}
        mutation={$passkeysMutation}
        updateDisabled={passkeys.updateDisabled}
        deleteDisabled={passkeys.deleteDisabled}
        previewOnly={Boolean(passkeys.report?.support.previewOnly)}
        onQueryChange={setPasskeysQuery}
        onFilterChange={setPasskeysStatusFilter}
        onSelect={selectPasskeyCredential}
        onEdit={beginCredentialUpdate}
        onDelete={beginCredentialDelete}
      />
    {/if}
  </section>

  <PasskeyUpdateDialog
    mutation={$passkeysMutation}
    onDraftChange={updateCredentialDraft}
    onEdit={editCredentialUpdate}
    onPreview={previewCredentialUpdate}
    onConfirm={handleConfirmUpdate}
    onRetry={retryPasskeysMutation}
    retryAllowed={mutationRetryAllowed}
    onClose={closePasskeysMutation}
  />
  <PasskeyDeleteDialog
    mutation={$passkeysMutation}
    onConfirm={handleConfirmDelete}
    onRetry={retryPasskeysMutation}
    retryAllowed={mutationRetryAllowed}
    onClose={closePasskeysMutation}
  />
{/if}

<style>
@layer blocks {
  .passkeys-screen {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
  }

  :global(.passkeys-state-alert) {
    min-width: 0;
  }
}

</style>
