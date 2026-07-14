<script lang="ts">
  import { Database, TriangleAlert } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import LargeBlobCleanupDialog from "$lib/components/largeblobs/LargeBlobCleanupDialog.svelte";
  import LargeBlobDeleteDialog from "$lib/components/largeblobs/LargeBlobDeleteDialog.svelte";
  import LargeBlobsInventory from "$lib/components/largeblobs/LargeBlobsInventory.svelte";
  import LargeBlobsOverview from "$lib/components/largeblobs/LargeBlobsOverview.svelte";
  import LargeBlobWriteDialog from "$lib/components/largeblobs/LargeBlobWriteDialog.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    beginLargeBlobCleanup,
    beginLargeBlobDelete,
    beginLargeBlobWrite,
    closeLargeBlobMutation,
    confirmLargeBlobCleanup,
    confirmLargeBlobDelete,
    confirmLargeBlobWrite,
    editLargeBlobWrite,
    previewLargeBlobWrite,
    reloadLargeBlobs,
    selectLargeBlobCredential,
    setLargeBlobsDecodeMode,
    setLargeBlobsPayloadEncoding,
    setLargeBlobsQuery,
    setLargeBlobsStatusFilter,
    setLargeBlobsVerificationFlow,
    updateLargeBlobWriteDraft,
  } from "$lib/controller";
  import { buildLargeBlobsPresentation } from "$lib/largeblobs-presentation";
  import {
    largeBlobsInventoryState,
    largeBlobsDecodeMode,
    largeBlobsMutation,
    largeBlobsQuery,
    largeBlobsReadState,
    largeBlobsSelectedCredentialID,
    largeBlobsStatusFilter,
    largeBlobsVerificationFlow,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    sessionStatus,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let largeBlobs = $derived(buildLargeBlobsPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    sessionBusy: $sessionBusy,
    sessionReady: $sessionStatus.state === "ready" && Boolean($sessionStatus.sessionId),
    inventoryState: $largeBlobsInventoryState,
    query: $largeBlobsQuery,
    statusFilter: $largeBlobsStatusFilter,
    selectedCredentialID: $largeBlobsSelectedCredentialID,
  }));
  async function handleReload() {
    const refreshed = await reloadLargeBlobs();
    if (refreshed) toast.success(m.large_blobs_reloaded());
    return refreshed;
  }

  async function handleConfirmWrite() {
    const succeeded = await confirmLargeBlobWrite();
    if (succeeded) toast.success(m.large_blob_written());
    return succeeded;
  }

  async function handleConfirmDelete() {
    const succeeded = await confirmLargeBlobDelete();
    if (succeeded) toast.success(m.large_blob_deleted());
    return succeeded;
  }

  async function handleConfirmCleanup() {
    const succeeded = await confirmLargeBlobCleanup();
    if (succeeded) toast.success(m.large_blob_cleanup_complete());
    return succeeded;
  }
</script>

{#if !largeBlobs.selector}
  <EmptyState
    title={m.select_authenticator()}
    message={m.select_authenticator_for_large_blobs()}
  />
{:else}
  <section class="large-blobs-screen" aria-labelledby="large-blobs-title">
    <LargeBlobsOverview
      presentation={largeBlobs}
      verificationFlow={$largeBlobsVerificationFlow}
      onReload={handleReload}
      onCleanup={beginLargeBlobCleanup}
      onVerificationFlowChange={setLargeBlobsVerificationFlow}
    />

    {#if largeBlobs.stale}
      <Alert.Root variant="warning" role="alert" class="large-blobs-state-alert" data-state="stale">
        <TriangleAlert aria-hidden="true" />
        <Alert.Title>{m.large_blobs_stale_title()}</Alert.Title>
        <Alert.Description>
          {m.large_blobs_stale_message()}
          {#if largeBlobs.failureMessage} {largeBlobs.failureMessage}{/if}
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if largeBlobs.unsupported}
      <EmptyState
        title={m.large_blobs_unsupported_title()}
        message={m.large_blobs_unsupported_message()}
        variant="compact"
      >
        {#snippet icon()}<Database aria-hidden="true" />{/snippet}
      </EmptyState>
    {:else if !largeBlobs.hasReport && !largeBlobs.loading}
      <EmptyState
        title={m.large_blobs_not_loaded()}
        message={largeBlobs.failureMessage ?? m.large_blobs_not_loaded_message()}
        variant="compact"
      >
        {#snippet icon()}<Database aria-hidden="true" />{/snippet}
        {#snippet actions()}
          <Button type="button" disabled={largeBlobs.reloadDisabled} onclick={handleReload}>
            {m.load_blobs()}
          </Button>
        {/snippet}
      </EmptyState>
    {:else}
      <LargeBlobsInventory
        presentation={largeBlobs}
        readState={$largeBlobsReadState}
        mutation={$largeBlobsMutation}
        decodeMode={$largeBlobsDecodeMode}
        onQueryChange={setLargeBlobsQuery}
        onFilterChange={setLargeBlobsStatusFilter}
        onSelect={selectLargeBlobCredential}
        onDecodeModeChange={setLargeBlobsDecodeMode}
        onWrite={beginLargeBlobWrite}
        onDelete={beginLargeBlobDelete}
      />
    {/if}
  </section>

  <LargeBlobWriteDialog
    mutation={$largeBlobsMutation}
    editingExisting={largeBlobs.selectedBlobPresent}
    onDraftChange={updateLargeBlobWriteDraft}
    onEncodingChange={setLargeBlobsPayloadEncoding}
    onEdit={editLargeBlobWrite}
    onPreview={previewLargeBlobWrite}
    onConfirm={handleConfirmWrite}
    onClose={closeLargeBlobMutation}
  />
  <LargeBlobDeleteDialog
    mutation={$largeBlobsMutation}
    onPreview={beginLargeBlobDelete}
    onConfirm={handleConfirmDelete}
    onClose={closeLargeBlobMutation}
  />
  <LargeBlobCleanupDialog
    mutation={$largeBlobsMutation}
    onPreview={beginLargeBlobCleanup}
    onConfirm={handleConfirmCleanup}
    onClose={closeLargeBlobMutation}
  />
{/if}

<style>
@layer blocks {
  .large-blobs-screen {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
  }

  :global(.large-blobs-state-alert) {
    min-width: 0;
  }
}
</style>
