<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  import { ErrorCategory } from "../../../../bindings/github.com/go-ctap/kit/model";

  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState } from "$lib/features/largeblobs/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    retryAllowed: boolean;
    onConfirm: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let { mutation, retryAllowed, onConfirm, onRetry, onClose }: Props = $props();

  let confirmationOpen = $derived(
    mutation.kind === "delete" && (
      mutation.phase === "review"
      || mutation.phase === "executing"
      || (mutation.phase === "error" && mutation.failedPhase === "executing" && Boolean(mutation.previewEnvelope))
    ),
  );
  let noopOpen = $derived(mutation.kind === "delete" && mutation.phase === "noop");
  let previewErrorOpen = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let busy = $derived(mutation.kind === "delete" && mutation.phase === "executing");
  let preview = $derived.by(() => {
    if (mutation.kind !== "delete" || !("previewEnvelope" in mutation) || !mutation.previewEnvelope) return null;
    return largeBlobMutationPreview(mutation.previewEnvelope);
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "delete" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return mutation.runtimeError?.message
      ?? mutation.responseEnvelope?.error?.message
      ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && (
      mutation.runtimeError?.category === ErrorCategory.ErrorCanceled
      || mutation.responseEnvelope?.error?.category === ErrorCategory.ErrorCanceled
    ),
  );

  function handleOpenChange(next: boolean) {
    if (!next && !busy) onClose();
  }

  function handleAction(event: MouseEvent) {
    event.preventDefault();
    if (busy || mutation.kind !== "delete") return;
    if (mutation.phase === "error") {
      void onRetry();
      return;
    }
    void onConfirm();
  }
</script>

<Dialog.Root open={noopOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "delete" && mutation.phase === "noop" && preview}
    <Dialog.Content class="large-blob-delete-info-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.large_blob_delete()}</Dialog.Title>
        <Dialog.Description>{m.large_blob_delete_noop()}</Dialog.Description>
      </Dialog.Header>
      <LargeBlobMutationPreview {preview} />
      <Dialog.Footer>
        <Button type="button" onclick={onClose}>{m.close()}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<Dialog.Root open={previewErrorOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "delete" && mutation.phase === "error" && mutation.failedPhase === "previewing"}
    <Dialog.Content class="large-blob-delete-error-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.delete_preview()}</Dialog.Title>
        <Dialog.Description>{m.review_mutation_before_delete()}</Dialog.Description>
      </Dialog.Header>

      <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
        <Alert.Title>
          {failureCanceled
            ? m.operation_canceled_with_label({ label: m.delete_preview() })
            : m.operation_failed()}
        </Alert.Title>
        <Alert.Description>{failureMessage}</Alert.Description>
      </Alert.Root>

      {#if preview}<LargeBlobMutationPreview {preview} />{/if}

      <Dialog.Footer>
        {#if retryAllowed}
          <Button type="button" onclick={() => void onRetry()}>{m.retry()}</Button>
        {/if}
        <Button variant="outline" type="button" onclick={onClose}>{m.close()}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<AlertDialog.Root open={confirmationOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "delete" && (
    mutation.phase === "review"
    || mutation.phase === "executing"
    || (mutation.phase === "error" && mutation.failedPhase === "executing" && mutation.previewEnvelope)
  )}
    <AlertDialog.Content class="large-blob-delete-dialog">
      <AlertDialog.Header>
        <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
        <AlertDialog.Title>{m.confirm_delete()}</AlertDialog.Title>
        <AlertDialog.Description>{m.review_mutation_before_delete()}</AlertDialog.Description>
      </AlertDialog.Header>

      {#if failureMessage}
        <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
          <Alert.Title>
            {failureCanceled
              ? m.operation_canceled_with_label({ label: m.large_blob_delete() })
              : m.operation_failed()}
          </Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if preview}<LargeBlobMutationPreview {preview} />{/if}

      <AlertDialog.Footer>
        <AlertDialog.Cancel disabled={busy} onclick={onClose}>{m.cancel()}</AlertDialog.Cancel>
        {#if mutation.phase !== "error" || retryAllowed}
          <AlertDialog.Action variant="destructive" disabled={busy} onclick={handleAction}>
            {#if busy}<Spinner data-icon="inline-start" aria-hidden="true" />{/if}
            {mutation.phase === "error" ? m.retry() : m.confirm_delete()}
          </AlertDialog.Action>
        {/if}
      </AlertDialog.Footer>
    </AlertDialog.Content>
  {/if}
</AlertDialog.Root>

<style>
@layer blocks {
  :global(.large-blob-delete-dialog),
  :global(.large-blob-delete-error-dialog),
  :global(.large-blob-delete-info-dialog) {
    width: min(42rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: auto;
  }
}
</style>
