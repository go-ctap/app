<script lang="ts">
  import { KeyRound, TriangleAlert } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import LargeBlobDestructiveDialog from "$lib/components/largeblobs/LargeBlobDestructiveDialog.svelte";
  import LargeBlobWriteDialog from "$lib/components/largeblobs/LargeBlobWriteDialog.svelte";
  import PasskeyDeleteDialog from "$lib/components/passkeys/PasskeyDeleteDialog.svelte";
  import PasskeysInventory from "$lib/components/passkeys/PasskeysInventory.svelte";
  import PasskeysOverview from "$lib/components/passkeys/PasskeysOverview.svelte";
  import PasskeyUpdateDialog from "$lib/components/passkeys/PasskeyUpdateDialog.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import {
    beginLargeBlobCleanup,
    beginLargeBlobDelete,
    beginPasskeyLargeBlobDelete,
    beginPasskeyLargeBlobWrite,
    checkPasskeyLargeBlob,
    closeLargeBlobMutation,
    confirmLargeBlobCleanup,
    confirmLargeBlobDelete,
    confirmLargeBlobWrite,
    editLargeBlobWrite,
    largeBlobsMutation,
    passkeyLargeBlobState,
    previewLargeBlobWrite,
    setLargeBlobsPayloadEncoding,
    updateLargeBlobWriteDraft,
  } from "$lib/features/largeblobs";
  import {
    beginCredentialDelete,
    beginCredentialUpdate,
    closePasskeysMutation,
    confirmCredentialDelete,
    confirmCredentialUpdate,
    editCredentialUpdate,
    previewCredentialUpdate,
    reloadPasskeys,
    selectPasskeyCredential,
    setPasskeysQuery,
    setPasskeysStatusFilter,
    setPasskeysVerificationFlow,
    updateCredentialDraft,
  } from "$lib/features/passkeys";
  import { navigateToScreen } from "$lib/features/workbench";
  import {
    authenticatorBusy,
    authenticatorStatus,
    selectedDevice,
    selectedSelector,
  } from "$lib/features/authenticator";
  import { buildPasskeysPresentation } from "$lib/passkeys-presentation";
  import {
    passkeysInventoryState,
    passkeysMutation,
    passkeysQuery,
    passkeysSelectedCredentialID,
    passkeysStatusFilter,
    passkeysVerificationFlow,
  } from "$lib/features/passkeys";

  import { m } from "../paraglide/messages.js";

  let passkeys = $derived(
    buildPasskeysPresentation({
      selectedSelector: $selectedSelector,
      selectedDevice: $selectedDevice,
      authenticatorBusy: $authenticatorBusy,
      authenticatorReady:
        $authenticatorStatus.state === "ready" && Boolean($authenticatorStatus.selectionId),
      inventoryState: $passkeysInventoryState,
      query: $passkeysQuery,
      statusFilter: $passkeysStatusFilter,
      selectedCredentialID: $passkeysSelectedCredentialID,
    }),
  );

  let largeBlobDisabled = $derived(
    passkeys.loading ||
      $authenticatorBusy ||
      $authenticatorStatus.state !== "ready" ||
      !$authenticatorStatus.selectionId ||
      $largeBlobsMutation.kind !== "idle",
  );

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

  function handleLargeBlobCheck(credentialIDHex: string) {
    return checkPasskeyLargeBlob(credentialIDHex, $passkeysVerificationFlow);
  }

  function handleLargeBlobWrite(credentialIDHex: string) {
    return beginPasskeyLargeBlobWrite(credentialIDHex, $passkeysVerificationFlow);
  }

  function handleLargeBlobDelete(credentialIDHex: string) {
    return beginPasskeyLargeBlobDelete(credentialIDHex, $passkeysVerificationFlow);
  }

  async function handlePreviewLargeBlobDelete(entryIndex: number | null) {
    if (entryIndex !== null) return beginLargeBlobDelete(entryIndex);

    const mutation = $largeBlobsMutation;

    return mutation.kind === "delete"
      ? beginPasskeyLargeBlobDelete(mutation.credentialIDHex, mutation.verificationFlow)
      : false;
  }

  async function handleConfirmLargeBlobWrite() {
    const succeeded = await confirmLargeBlobWrite();

    if (succeeded) toast.success(m.large_blob_written());

    return succeeded;
  }

  async function handleConfirmLargeBlobDelete() {
    const succeeded = await confirmLargeBlobDelete();

    if (succeeded) toast.success(m.large_blob_deleted());

    return succeeded;
  }
</script>

{#if passkeys.selector}
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
        onQueryChange={setPasskeysQuery}
        onFilterChange={setPasskeysStatusFilter}
        onSelect={selectPasskeyCredential}
        onEdit={beginCredentialUpdate}
        onDelete={beginCredentialDelete}
        largeBlobState={$passkeyLargeBlobState}
        {largeBlobDisabled}
        onLargeBlobCheck={handleLargeBlobCheck}
        onLargeBlobWrite={handleLargeBlobWrite}
        onLargeBlobDelete={handleLargeBlobDelete}
        onOpenLab={() => void navigateToScreen("lab")}
        onReload={handleReload}
      />
    {/if}
  </section>

  <PasskeyUpdateDialog
    mutation={$passkeysMutation}
    onDraftChange={updateCredentialDraft}
    onEdit={editCredentialUpdate}
    onPreview={previewCredentialUpdate}
    onConfirm={handleConfirmUpdate}
    onClose={closePasskeysMutation}
  />

  <PasskeyDeleteDialog
    mutation={$passkeysMutation}
    onPreview={beginCredentialDelete}
    onConfirm={handleConfirmDelete}
    onClose={closePasskeysMutation}
  />

  <LargeBlobWriteDialog
    mutation={$largeBlobsMutation}
    onDraftChange={updateLargeBlobWriteDraft}
    onEncodingChange={setLargeBlobsPayloadEncoding}
    onEdit={editLargeBlobWrite}
    onPreview={previewLargeBlobWrite}
    onConfirm={handleConfirmLargeBlobWrite}
    onClose={closeLargeBlobMutation}
  />

  <LargeBlobDestructiveDialog
    mutation={$largeBlobsMutation}
    onDeletePreview={handlePreviewLargeBlobDelete}
    onDeleteConfirm={handleConfirmLargeBlobDelete}
    onCleanupPreview={beginLargeBlobCleanup}
    onCleanupConfirm={confirmLargeBlobCleanup}
    onClose={closeLargeBlobMutation}
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
