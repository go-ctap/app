<script lang="ts">
  import { Database, TriangleAlert } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import LargeBlobDestructiveDialog from "$lib/components/largeblobs/LargeBlobDestructiveDialog.svelte";
  import LargeBlobsInventory from "$lib/components/largeblobs/LargeBlobsInventory.svelte";
  import LargeBlobsOverview from "$lib/components/largeblobs/LargeBlobsOverview.svelte";
  import LargeBlobWriteDialog from "$lib/components/largeblobs/LargeBlobWriteDialog.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
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
    selectLargeBlobEntry,
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
    largeBlobsDecodeState,
    largeBlobsMutation,
    largeBlobsQuery,
    largeBlobsReadState,
    largeBlobsSelectedEntryIndex,
    largeBlobsStatusFilter,
    largeBlobsVerificationFlow,
  } from "$lib/features/largeblobs";

  import { m } from "../paraglide/messages.js";

  let largeBlobs = $derived(
    buildLargeBlobsPresentation({
      selectedSelector: $selectedSelector,
      selectedDevice: $selectedDevice,
      authenticatorBusy: $authenticatorBusy,
      authenticatorReady:
        $authenticatorStatus.state === "ready" && Boolean($authenticatorStatus.selectionId),
      inventoryState: $largeBlobsInventoryState,
      query: $largeBlobsQuery,
      statusFilter: $largeBlobsStatusFilter,
      selectedEntryIndex: $largeBlobsSelectedEntryIndex,
    }),
  );

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

{#if largeBlobs.selector}
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
        <Alert.Description>{m.large_blobs_stale_message()}</Alert.Description>
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
        message={m.large_blobs_not_loaded_message()}
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
        decodeState={$largeBlobsDecodeState}
        mutation={$largeBlobsMutation}
        decodeMode={$largeBlobsDecodeMode}
        onQueryChange={setLargeBlobsQuery}
        onFilterChange={setLargeBlobsStatusFilter}
        onSelect={selectLargeBlobEntry}
        onDecodeModeChange={setLargeBlobsDecodeMode}
        onWrite={beginLargeBlobWrite}
        onDelete={beginLargeBlobDelete}
        onOpenLab={() => void navigateToScreen("lab")}
        onReload={handleReload}
      />
    {/if}
  </section>

  <LargeBlobWriteDialog
    mutation={$largeBlobsMutation}
    onDraftChange={updateLargeBlobWriteDraft}
    onEncodingChange={setLargeBlobsPayloadEncoding}
    onEdit={editLargeBlobWrite}
    onPreview={previewLargeBlobWrite}
    onConfirm={handleConfirmWrite}
    onClose={closeLargeBlobMutation}
  />

  <LargeBlobDestructiveDialog
    mutation={$largeBlobsMutation}
    onDeletePreview={beginLargeBlobDelete}
    onDeleteConfirm={handleConfirmDelete}
    onCleanupPreview={beginLargeBlobCleanup}
    onCleanupConfirm={handleConfirmCleanup}
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
