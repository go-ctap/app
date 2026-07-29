<script lang="ts">
  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import DestructiveMutationDialogs from "$lib/components/shared/DestructiveMutationDialogs.svelte";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState } from "$lib/features/largeblobs/state";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let { mutation, onPreview, onConfirm, onClose }: Props = $props();

  let confirmationOpen = $derived(
    mutation.kind === "cleanup" && (
      mutation.phase === "review"
      || (mutation.phase === "error" && mutation.failedPhase === "executing")
    ),
  );
  let previewErrorOpen = $derived(
    mutation.kind === "cleanup" && mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let preview = $derived.by(() => {
    if (mutation.kind !== "cleanup" || !("previewEnvelope" in mutation)) return null;
    if (mutation.phase === "error") {
      return largeBlobMutationPreview(mutation.previewEnvelope ?? mutation.responseEnvelope);
    }
    return largeBlobMutationPreview(mutation.previewEnvelope);
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "cleanup" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return localizeFailure(mutation.runtimeError)
      ?? localizeFailure(mutation.responseEnvelope?.error)
      ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "cleanup" && mutation.phase === "error" && (
      isCanceledFailure(mutation.runtimeError)
      || isCanceledFailure(mutation.responseEnvelope?.error)
    ),
  );
</script>

{#if mutation.kind === "cleanup"}
  <DestructiveMutationDialogs
    {previewErrorOpen}
    {confirmationOpen}
    previewTitle={m.large_blob_cleanup_preview()}
    previewDescription={m.large_blob_cleanup_description()}
    previewCanceledTitle={m.operation_canceled_with_label({
      label: m.large_blob_cleanup_preview(),
    })}
    operationCanceledTitle={m.operation_canceled_with_label({ label: m.large_blob_cleanup() })}
    confirmationTitle={m.confirm_cleanup()}
    confirmationDescription={m.large_blob_cleanup_description()}
    retryLabel={m.preview_cleanup()}
    confirmLabel={m.confirm_cleanup()}
    {failureMessage}
    {failureCanceled}
    onRetry={onPreview}
    {onConfirm}
    {onClose}
  >
    {#snippet previewContent()}
      {#if preview}<LargeBlobMutationPreview {preview} />{/if}
    {/snippet}
    {#snippet confirmationContent()}
      {#if preview}<LargeBlobMutationPreview {preview} />{/if}
    {/snippet}
  </DestructiveMutationDialogs>
{/if}
