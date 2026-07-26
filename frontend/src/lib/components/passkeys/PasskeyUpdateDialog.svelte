<script lang="ts">
  import { ArrowRight, Pencil } from "@lucide/svelte";

  import type { Warning } from "../../../../bindings/github.com/go-ctap/kit/model/safety";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { credentialUpdatePreview } from "$lib/ctapkit-results";
  import type {
    CredentialUpdateForm,
    CredentialUpdateValidationError,
    PasskeysMutationState,
  } from "$lib/features/passkeys/state";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: PasskeysMutationState;
    onDraftChange: (patch: Partial<CredentialUpdateForm>) => void;
    onEdit: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let {
    mutation,
    onDraftChange,
    onEdit,
    onPreview,
    onConfirm,
    onClose,
  }: Props = $props();

  let open = $derived(
    mutation.kind === "update" && (
      mutation.phase === "editing"
      || mutation.phase === "review"
      || mutation.phase === "error"
    ),
  );
  let preview = $derived.by(() => {
    if (mutation.kind !== "update") return null;
    if (mutation.phase === "review") {
      return credentialUpdatePreview(mutation.previewEnvelope);
    }
    if (mutation.phase === "error" && mutation.previewEnvelope) {
      return credentialUpdatePreview(mutation.previewEnvelope);
    }
    return null;
  });
  let validationError = $derived.by((): CredentialUpdateValidationError | null => {
    if (mutation.kind !== "update") return null;
    if (mutation.phase === "editing" || mutation.phase === "error") {
      return mutation.validationError;
    }
    return null;
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "update" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return localizeFailure(mutation.runtimeError) ?? localizeFailure(mutation.responseEnvelope?.error) ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "update" && mutation.phase === "error" && (
      isCanceledFailure(mutation.runtimeError)
      || isCanceledFailure(mutation.responseEnvelope?.error)
    ),
  );
  let failedPhase = $derived(mutation.phase === "error" ? mutation.failedPhase : null);
  let showForm = $derived(
    mutation.kind === "update" && (
      mutation.phase === "editing"
      || (mutation.phase === "error" && mutation.failedPhase === "previewing")
    ),
  );

  function validationMessage(error: CredentialUpdateValidationError | null) {
    if (error === "no-changes") return m.credential_update_no_changes();
    return "";
  }

  function shown(value: string | undefined) {
    return value?.trim() || m.not_reported();
  }

  function warningVariant(warning: Warning) {
    return warning.code === "credential.update_user.mutation" || warning.severity === "destructive"
      ? "destructive"
      : "warning";
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (mutation.kind !== "update") return;
    if (mutation.phase === "review") {
      void onConfirm();
      return;
    }
    if (mutation.phase === "error") {
      if (mutation.failedPhase === "previewing") void onPreview();
      else void onConfirm();
      return;
    }
    void onPreview();
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  {#if open && mutation.kind === "update"}
    <Dialog.Content class="passkey-update-dialog">
      <ModalScrollArea>
        <Dialog.Header>
          <Dialog.Title>{m.edit_credential_user()}</Dialog.Title>
        </Dialog.Header>

        <form class="passkey-update-form" onsubmit={handleSubmit}>
        {#if showForm}
          <Field.FieldGroup>
            <Field.Field>
              <Field.FieldLabel for="passkey-update-name">{m.user_name()}</Field.FieldLabel>
              <Input
                id="passkey-update-name"
                value={mutation.form.name}
                autocomplete="off"
                oninput={(event) => onDraftChange({ name: event.currentTarget.value })}
              />
            </Field.Field>

            <Field.Field>
              <Field.FieldLabel for="passkey-update-display-name">{m.display_name()}</Field.FieldLabel>
              <Input
                id="passkey-update-display-name"
                value={mutation.form.displayName}
                autocomplete="off"
                oninput={(event) => onDraftChange({ displayName: event.currentTarget.value })}
              />
            </Field.Field>
          </Field.FieldGroup>
        {/if}

        {#if validationError === "no-changes"}
          <Alert.Root role="alert">
            <Alert.Title>{m.credential_update_preview()}</Alert.Title>
            <Alert.Description>{validationMessage(validationError)}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if failureMessage}
          <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
            <Alert.Title>
              {failureCanceled
                ? m.operation_canceled_with_label({ label: failedPhase === "previewing" ? m.credential_update_preview() : m.credential_update() })
                : m.operation_failed()}
            </Alert.Title>
            <Alert.Description>{failureMessage}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if preview}
          <section class="passkey-update-preview" aria-labelledby="passkey-update-preview-title">
            <div class="passkey-update-preview-heading">
              <h3 id="passkey-update-preview-title">{m.credential_update_preview()}</h3>
              {#if mutation.phase === "review"}
                <Button variant="ghost" size="sm" type="button" onclick={onEdit}>
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  {m.edit()}
                </Button>
              {/if}
            </div>

            <div class="passkey-update-columns">
              <div>
                <span>{m.current_value()}</span>
                <dl>
                  <div><dt>{m.user_name()}</dt><dd>{shown(preview.current.name)}</dd></div>
                  <div><dt>{m.display_name()}</dt><dd>{shown(preview.current.displayName)}</dd></div>
                </dl>
              </div>
              <ArrowRight class="passkey-update-arrow" aria-hidden="true" />
              <div>
                <span>{m.proposed_value()}</span>
                <dl>
                  <div><dt>{m.user_name()}</dt><dd>{shown(preview.proposed.name)}</dd></div>
                  <div><dt>{m.display_name()}</dt><dd>{shown(preview.proposed.displayName)}</dd></div>
                </dl>
              </div>
            </div>

            {#if preview.warnings?.length}
              <div class="passkey-preview-warnings">
                <strong>{m.preview_warnings()}</strong>
                {#each preview.warnings as warning (warning.code)}
                  <Alert.Root variant={warningVariant(warning)}>
                    <Alert.Description>{warningMessage(warning)}</Alert.Description>
                  </Alert.Root>
                {/each}
              </div>
            {/if}

            <JsonDisclosure value={preview} title={m.preview_json()} />
          </section>
        {/if}

        <Dialog.Footer>
          <Button type="submit">
            {mutation.phase === "review"
              || (mutation.phase === "error" && mutation.failedPhase === "executing")
              ? m.confirm_update()
              : m.preview_change()}
          </Button>
          <Button variant="outline" type="button" onclick={onClose}>{m.cancel()}</Button>
        </Dialog.Footer>
        </form>
      </ModalScrollArea>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
@layer blocks {
  :global(.passkey-update-dialog) {
    width: min(44rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
  }

  .passkey-update-form,
  .passkey-update-preview,
  .passkey-preview-warnings {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .passkey-update-preview {
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .passkey-update-preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .passkey-update-preview-heading h3 {
    margin: 0;
    font-size: 0.82rem;
  }

  .passkey-update-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .passkey-update-columns > div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .passkey-update-columns > div > span {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .passkey-update-columns dl {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
  }

  .passkey-update-columns dl > div {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--border);
    padding: var(--space-2);
  }

  .passkey-update-columns dt {
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  .passkey-update-columns dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  :global(.passkey-update-arrow) {
    color: var(--muted-foreground);
  }

  @media (max-width: 620px) {
    .passkey-update-columns {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.passkey-update-arrow) {
      transform: rotate(90deg);
      justify-self: center;
    }
  }
}
</style>
