<script lang="ts">
  import DestructiveMutationDialogs from "$lib/components/shared/DestructiveMutationDialogs.svelte";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { credentialDeleteOutput } from "$lib/ctapkit-results";
  import type { PasskeysMutationState } from "$lib/features/passkeys/state";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: PasskeysMutationState;
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
  let output = $derived.by(() => {
    if (mutation.kind !== "delete") return null;
    if (mutation.phase === "review") return credentialDeleteOutput(mutation.previewEnvelope);
    if (mutation.phase === "error" && mutation.previewEnvelope) {
      return credentialDeleteOutput(mutation.previewEnvelope);
    }
    return null;
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

  function shown(value: string | undefined) {
    return value?.trim() || m.not_reported();
  }
</script>

{#if mutation.kind === "delete"}
  <DestructiveMutationDialogs
    {previewErrorOpen}
    {confirmationOpen}
    previewTitle={m.credential_delete_preview()}
    previewCanceledTitle={m.operation_canceled_with_label({ label: m.credential_delete_preview() })}
    operationCanceledTitle={m.operation_canceled_with_label({ label: m.credential_delete() })}
    confirmationTitle={m.confirm_delete()}
    retryLabel={m.delete()}
    confirmLabel={m.confirm_delete()}
    {failureMessage}
    {failureCanceled}
    size="compact"
    onRetry={() => onPreview(mutation.credentialIDHex)}
    {onConfirm}
    {onClose}
  >
    {#snippet confirmationContent()}
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
                <Alert.Description>{warningMessage(warning)}</Alert.Description>
              </Alert.Root>
            {/each}
          </div>
        {/if}

        <JsonDisclosure value={output.preview} title={m.preview_json()} />
      {/if}
    {/snippet}
  </DestructiveMutationDialogs>
{/if}

<style>
@layer blocks {
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
