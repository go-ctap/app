<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  import { ErrorCategory } from "../../../../bindings/github.com/go-ctap/kit/model";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { credentialDeleteOutput } from "$lib/ctapkit-results";
  import type { PasskeysMutationState } from "$lib/features/passkeys/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: PasskeysMutationState;
    onConfirm: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    retryAllowed: boolean;
    onClose: () => void;
  };

  let { mutation, onConfirm, onRetry, retryAllowed, onClose }: Props = $props();

  let confirmationOpen = $derived(
    mutation.kind === "delete" && (
      mutation.phase === "review"
      || mutation.phase === "executing"
      || (mutation.phase === "error" && mutation.failedPhase === "executing" && Boolean(mutation.previewEnvelope))
    ),
  );
  let previewErrorOpen = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let busy = $derived(
    mutation.kind === "delete" && mutation.phase === "executing",
  );
  let output = $derived.by(() => {
    if (mutation.kind !== "delete") return null;
    if (mutation.phase === "review" || mutation.phase === "executing") {
      return credentialDeleteOutput(mutation.previewEnvelope);
    }
    if (mutation.phase === "error" && mutation.previewEnvelope) {
      return credentialDeleteOutput(mutation.previewEnvelope);
    }
    return null;
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "delete" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return mutation.runtimeError?.message ?? mutation.responseEnvelope?.error?.message ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "delete" && mutation.phase === "error" && (
      mutation.runtimeError?.category === ErrorCategory.ErrorCanceled
      || mutation.responseEnvelope?.error?.category === ErrorCategory.ErrorCanceled
    ),
  );

  function warningMessage(code: string, fallback: string) {
    if (code === "credential.delete.destructive") return m.credential_delete_warning_destructive();
    if (code === "credential.delete.irreversible") return m.credential_delete_warning_irreversible();
    return fallback;
  }

  function shown(value: string | undefined) {
    return value?.trim() || m.not_reported();
  }

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

<Dialog.Root open={previewErrorOpen} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "delete" && mutation.phase === "error" && mutation.failedPhase === "previewing"}
    <Dialog.Content class="passkey-delete-preview-error-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.credential_delete_preview()}</Dialog.Title>
      </Dialog.Header>

      <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
        <Alert.Title>
          {failureCanceled
            ? m.operation_canceled_with_label({ label: m.credential_delete_preview() })
            : m.operation_failed()}
        </Alert.Title>
        <Alert.Description>{failureMessage}</Alert.Description>
      </Alert.Root>

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
    <AlertDialog.Content class="passkey-delete-dialog">
      <AlertDialog.Header>
        <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
        <AlertDialog.Title>{m.confirm_delete()}</AlertDialog.Title>
      </AlertDialog.Header>

      {#if failureMessage}
        <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
          <Alert.Title>
            {failureCanceled
              ? m.operation_canceled_with_label({ label: m.credential_delete() })
              : m.operation_failed()}
          </Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if output}
        <dl class="passkey-delete-target">
          <div>
            <dt>{m.relying_parties()}</dt>
            <dd>{shown(output.preview.rpName)} <code>{output.preview.rpID}</code></dd>
          </div>
          <div>
            <dt>{m.user_name()}</dt>
            <dd>{shown(output.preview.displayName)} <span>{shown(output.preview.userName)}</span></dd>
          </div>
          <div>
            <dt>{m.user_id_hex()}</dt>
            <dd><code>{shown(output.preview.userIDHex)}</code></dd>
          </div>
          <div>
            <dt>{m.credential_id()}</dt>
            <dd><code>{output.preview.credentialIDHex}</code></dd>
          </div>
        </dl>

        {#if output.preview.warnings?.length}
          <div class="passkey-delete-warnings">
            <strong>{m.preview_warnings()}</strong>
            {#each output.preview.warnings as warning (warning.code)}
              <Alert.Root variant={warning.severity === "destructive" ? "destructive" : "warning"}>
                <Alert.Title><Badge variant="outline">{warning.code}</Badge></Alert.Title>
                <Alert.Description>{warningMessage(warning.code, warning.message)}</Alert.Description>
              </Alert.Root>
            {/each}
          </div>
        {/if}
      {/if}

      <AlertDialog.Footer>
        <AlertDialog.Cancel disabled={busy} onclick={onClose}>{m.cancel()}</AlertDialog.Cancel>
        {#if mutation.phase !== "error" || retryAllowed}
          <AlertDialog.Action
            variant="destructive"
            disabled={busy}
            onclick={handleAction}
          >
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
  :global(.passkey-delete-dialog) {
    width: min(34rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: auto;
  }

  :global(.passkey-delete-preview-error-dialog) {
    width: min(30rem, calc(100vw - 2rem));
  }

  .passkey-delete-target,
  .passkey-delete-warnings {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .passkey-delete-target {
    margin: 0;
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .passkey-delete-target > div {
    display: grid;
    grid-template-columns: minmax(7rem, 0.4fr) minmax(0, 1fr);
    gap: var(--space-2);
  }

  .passkey-delete-target dt {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .passkey-delete-target dd {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
    margin: 0;
    overflow-wrap: anywhere;
  }

  .passkey-delete-target dd span {
    color: var(--muted-foreground);
  }
}
</style>
