<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState } from "$lib/features/largeblobs/state";
  import { failureMessage as localizeFailure, isCanceledFailure, isIncorrectPINFailure } from "$lib/failure";

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
      || mutation.phase === "executing"
      || (mutation.phase === "error" && mutation.failedPhase === "executing" && Boolean(mutation.previewEnvelope))
    ),
  );
  let noopOpen = $derived(mutation.kind === "cleanup" && mutation.phase === "noop");
  let previewErrorOpen = $derived(
    mutation.kind === "cleanup" && mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let busy = $derived(mutation.kind === "cleanup" && mutation.phase === "executing");
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
  let incorrectPIN = $derived(
    mutation.kind === "cleanup" && mutation.phase === "error" && mutation.failedPhase === "executing" &&
    isIncorrectPINFailure(mutation.responseEnvelope?.error),
  );

  function handleOpenChange(next: boolean) {
    if (!next && !busy) onClose();
  }

  function handleAction(event: MouseEvent) {
    event.preventDefault();
    if (busy || mutation.kind !== "cleanup") return;
    void onConfirm();
  }
</script>

<Dialog.Root open={noopOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "cleanup" && mutation.phase === "noop" && preview}
    <Dialog.Content class="large-blob-cleanup-info-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.large_blob_cleanup()}</Dialog.Title>
        <Dialog.Description>{m.large_blob_cleanup_noop()}</Dialog.Description>
      </Dialog.Header>
      <LargeBlobMutationPreview {preview} />
      <Dialog.Footer><Button type="button" onclick={onClose}>{m.close()}</Button></Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<Dialog.Root open={previewErrorOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "cleanup" && mutation.phase === "error" && mutation.failedPhase === "previewing"}
    <Dialog.Content class="large-blob-cleanup-error-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.large_blob_cleanup_preview()}</Dialog.Title>
        <Dialog.Description>{m.large_blob_cleanup_description()}</Dialog.Description>
      </Dialog.Header>

      <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
        <Alert.Title>
          {failureCanceled
            ? m.operation_canceled_with_label({ label: m.large_blob_cleanup_preview() })
            : m.operation_failed()}
        </Alert.Title>
        <Alert.Description>{failureMessage}</Alert.Description>
      </Alert.Root>

      {#if preview}<LargeBlobMutationPreview {preview} />{/if}

      <Dialog.Footer>
        <Button type="button" onclick={() => void onPreview()}>{m.preview_cleanup()}</Button>
        <Button variant="outline" type="button" onclick={onClose}>{m.close()}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<AlertDialog.Root open={confirmationOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "cleanup" && (
    mutation.phase === "review"
    || mutation.phase === "executing"
    || (mutation.phase === "error" && mutation.failedPhase === "executing" && mutation.previewEnvelope)
  )}
    <AlertDialog.Content class="large-blob-cleanup-dialog">
      <AlertDialog.Header>
        <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
        <AlertDialog.Title>{m.confirm_cleanup()}</AlertDialog.Title>
        <AlertDialog.Description>{m.large_blob_cleanup_description()}</AlertDialog.Description>
      </AlertDialog.Header>

      {#if failureMessage}
        <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
          <Alert.Title>
            {failureCanceled
              ? m.operation_canceled_with_label({ label: m.large_blob_cleanup() })
              : m.operation_failed()}
          </Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if preview}<LargeBlobMutationPreview {preview} />{/if}

      <AlertDialog.Footer>
        <AlertDialog.Cancel disabled={busy} onclick={onClose}>
          {mutation.phase === "error" && !incorrectPIN ? m.close() : m.cancel()}
        </AlertDialog.Cancel>
        {#if mutation.phase !== "error" || incorrectPIN}
          <AlertDialog.Action variant="destructive" disabled={busy} onclick={handleAction}>
            {#if busy}<Spinner data-icon="inline-start" aria-hidden="true" />{/if}
            {m.confirm_cleanup()}
          </AlertDialog.Action>
        {/if}
      </AlertDialog.Footer>
    </AlertDialog.Content>
  {/if}
</AlertDialog.Root>

<style>
@layer blocks {
  :global(.large-blob-cleanup-dialog),
  :global(.large-blob-cleanup-error-dialog),
  :global(.large-blob-cleanup-info-dialog) {
    width: min(42rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: auto;
  }
}
</style>
