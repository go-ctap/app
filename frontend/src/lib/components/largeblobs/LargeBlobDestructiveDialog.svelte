<script lang="ts">
  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import DestructiveMutationDialogs from "$lib/components/shared/DestructiveMutationDialogs.svelte";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState } from "$lib/features/largeblobs/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    onDeletePreview: (entryIndex: number) => void | Promise<boolean>;
    onDeleteConfirm: () => void | Promise<boolean>;
    onCleanupPreview: () => void | Promise<boolean>;
    onCleanupConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let {
    mutation,
    onDeletePreview,
    onDeleteConfirm,
    onCleanupPreview,
    onCleanupConfirm,
    onClose,
  }: Props = $props();

  let destructive = $derived(mutation.kind === "delete" || mutation.kind === "cleanup");

  let operation = $derived(mutation.operation);

  let preview = $derived.by(() => {
    if (
      !destructive ||
      (operation.phase !== "review" &&
        operation.phase !== "executing" &&
        !(operation.phase === "error" && operation.failedPhase === "executing"))
    )
      return null;

    return largeBlobMutationPreview(operation.previewEnvelope);
  });

  let cleanup = $derived(mutation.kind === "cleanup");

  function retry() {
    return mutation.kind === "delete" ? onDeletePreview(mutation.entryIndex) : onCleanupPreview();
  }

  function confirm() {
    return mutation.kind === "delete" ? onDeleteConfirm() : onCleanupConfirm();
  }
</script>

{#if destructive}
  <DestructiveMutationDialogs
    {operation}
    previewTitle={cleanup ? m.large_blob_cleanup_preview() : m.delete_preview()}
    previewDescription={cleanup ? m.large_blob_cleanup_description() : undefined}
    previewCanceledTitle={m.operation_canceled_with_label({
      label: cleanup ? m.large_blob_cleanup_preview() : m.delete_preview(),
    })}
    operationCanceledTitle={m.operation_canceled_with_label({
      label: cleanup ? m.large_blob_cleanup() : m.large_blob_delete(),
    })}
    confirmationTitle={cleanup ? m.confirm_cleanup() : m.confirm_delete()}
    confirmationDescription={cleanup ? m.large_blob_cleanup_description() : undefined}
    retryLabel={cleanup ? m.preview_cleanup() : m.delete()}
    confirmLabel={cleanup ? m.confirm_cleanup() : m.confirm_delete()}
    onRetry={retry}
    onConfirm={confirm}
    {onClose}
  >
    {#snippet confirmationContent()}
      {#if preview}<LargeBlobMutationPreview {preview} />{/if}
    {/snippet}
  </DestructiveMutationDialogs>
{/if}
