<script lang="ts">
  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import DestructiveMutationDialogs from "$lib/components/shared/DestructiveMutationDialogs.svelte";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState } from "$lib/features/largeblobs/state";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    onPreview: (credentialIDHex: string) => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let { mutation, onPreview, onConfirm, onClose }: Props = $props();

  let confirmationOpen = $derived(
    mutation.kind === "delete" && (
      mutation.phase === "review"
      || (mutation.phase === "error" && mutation.failedPhase === "executing")
    ),
  );
  let previewErrorOpen = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let preview = $derived.by(() => {
    if (mutation.kind !== "delete" || !("previewEnvelope" in mutation)) return null;
    if (mutation.phase === "error") {
      return largeBlobMutationPreview(mutation.previewEnvelope ?? mutation.responseEnvelope);
    }
    return largeBlobMutationPreview(mutation.previewEnvelope);
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "delete" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return localizeFailure(mutation.runtimeError)
      ?? localizeFailure(mutation.responseEnvelope?.error)
      ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && (
      isCanceledFailure(mutation.runtimeError)
      || isCanceledFailure(mutation.responseEnvelope?.error)
    ),
  );
</script>

{#if mutation.kind === "delete"}
  <DestructiveMutationDialogs
    {previewErrorOpen}
    {confirmationOpen}
    previewTitle={m.delete_preview()}
    previewCanceledTitle={m.operation_canceled_with_label({ label: m.delete_preview() })}
    operationCanceledTitle={m.operation_canceled_with_label({ label: m.large_blob_delete() })}
    confirmationTitle={m.confirm_delete()}
    retryLabel={m.delete()}
    confirmLabel={m.confirm_delete()}
    {failureMessage}
    {failureCanceled}
    onRetry={() => onPreview(mutation.credentialIDHex)}
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
