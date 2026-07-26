<script lang="ts">
  import { Database } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import LargeBlobCleanupDialog from "$lib/components/largeblobs/LargeBlobCleanupDialog.svelte";
  import LargeBlobDeleteDialog from "$lib/components/largeblobs/LargeBlobDeleteDialog.svelte";
  import LargeBlobsInventory from "$lib/components/largeblobs/LargeBlobsInventory.svelte";
  import LargeBlobsOverview from "$lib/components/largeblobs/LargeBlobsOverview.svelte";
  import LargeBlobWriteDialog from "$lib/components/largeblobs/LargeBlobWriteDialog.svelte";
  import InventoryScreenContent from "$lib/components/shared/InventoryScreenContent.svelte";
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
  } from "$lib/features/largeblobs";
  import { navigateToScreen } from "$lib/features/workbench";
  import {
    authenticatorBusy,
    authenticatorStatus,
    selectedDevice,
    selectedSelector,
  } from "$lib/features/authenticator";
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
  } from "$lib/features/largeblobs";

  import { m } from "../paraglide/messages.js";

  let largeBlobs = $derived(buildLargeBlobsPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    authenticatorBusy: $authenticatorBusy,
    authenticatorReady: $authenticatorStatus.state === "ready" && Boolean($authenticatorStatus.selectionId),
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

  function handleOpenLab() {
    void navigateToScreen("lab");
  }
</script>

{#if largeBlobs.selector}
  <section class="large-blobs-screen" aria-labelledby="large-blobs-title">
    <LargeBlobsOverview
      presentation={largeBlobs}
      verificationFlow={$largeBlobsVerificationFlow}
      onReload={handleReload}
      onCleanup={beginLargeBlobCleanup}
      onVerificationFlowChange={setLargeBlobsVerificationFlow}
    />

    <InventoryScreenContent
      stale={largeBlobs.stale}
      unsupported={largeBlobs.unsupported}
      hasReport={largeBlobs.hasReport}
      loading={largeBlobs.loading}
      reloadDisabled={largeBlobs.reloadDisabled}
      staleTitle={m.large_blobs_stale_title()}
      staleMessage={m.large_blobs_stale_message()}
      unsupportedTitle={m.large_blobs_unsupported_title()}
      unsupportedMessage={m.large_blobs_unsupported_message()}
      notLoadedTitle={m.large_blobs_not_loaded()}
      notLoadedMessage={m.large_blobs_not_loaded_message()}
      loadLabel={m.load_blobs()}
      onReload={handleReload}
    >
      {#snippet iconContent()}<Database aria-hidden="true" />{/snippet}
      {#snippet inventoryContent()}
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
          onOpenLab={handleOpenLab}
          onReload={handleReload}
        />
      {/snippet}
    </InventoryScreenContent>
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

}
</style>
