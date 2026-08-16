<script lang="ts">
  import { Pencil } from "@lucide/svelte";

  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Field from "$lib/components/ui/field";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import {
    confirmedFailureCanceled,
    confirmedFailureMessage,
  } from "$lib/confirmed-operation-presentation";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState, LargeBlobWriteDraft } from "$lib/features/largeblobs/state";
  import {
    parseLargeBlobPayload,
    type LargeBlobPayloadEncoding,
    type LargeBlobPayloadValidationError,
  } from "$lib/largeblobs-payload";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    onDraftChange: (patch: Partial<LargeBlobWriteDraft>) => void;
    onEncodingChange: (encoding: LargeBlobPayloadEncoding) => void;
    onEdit: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let { mutation, onDraftChange, onEncodingChange, onEdit, onPreview, onConfirm, onClose }: Props =
    $props();

  let operation = $derived(mutation.operation);

  let writeLabel = $derived(
    mutation.kind === "write" && !mutation.existing
      ? m.large_blob_attach_data()
      : m.large_blob_replace_data(),
  );

  let open = $derived(
    mutation.kind === "write" &&
      (operation.phase === "editing" ||
        operation.phase === "review" ||
        operation.phase === "error"),
  );

  let fieldsLocked = $derived(
    mutation.kind === "write" &&
      operation.phase !== "editing" &&
      !(operation.phase === "error" && operation.failedPhase === "previewing"),
  );

  let preview = $derived.by(() => {
    if (mutation.kind !== "write") return null;

    const writeOperation = mutation.operation;

    if (
      writeOperation.phase === "review" ||
      (writeOperation.phase === "error" && writeOperation.failedPhase === "executing")
    ) {
      return largeBlobMutationPreview(writeOperation.previewEnvelope);
    }

    return null;
  });

  let validationError = $derived.by((): LargeBlobPayloadValidationError | null => {
    if (mutation.kind !== "write") return null;

    if (mutation.operation.phase === "editing") {
      return mutation.operation.validationError;
    }

    return null;
  });

  let parsedPayload = $derived.by(() => {
    if (mutation.kind !== "write") return null;

    return parseLargeBlobPayload(mutation.draft.payload, mutation.draft.encoding);
  });

  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "write" || mutation.operation.phase !== "error") return null;

    return confirmedFailureMessage(mutation.operation);
  });

  let failureCanceled = $derived(
    mutation.kind === "write" && operation.phase === "error" && confirmedFailureCanceled(operation),
  );

  let failedPhase = $derived(operation.phase === "error" ? operation.failedPhase : null);

  function validationMessage(error: LargeBlobPayloadValidationError | null) {
    if (error === "invalid-hex-character") return m.payload_hex_invalid();

    if (error === "odd-hex-length") return m.payload_hex_odd_length();

    return "";
  }

  function handleEncodingChange(value: string | string[]) {
    if (Array.isArray(value)) return;

    if (!value) return;

    onEncodingChange(value === "hex" ? "hex" : "utf8");
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (operation.phase === "review") {
      void onConfirm();

      return;
    }

    if (operation.phase === "error") {
      if (operation.failedPhase === "previewing") void onPreview();
      else void onConfirm();

      return;
    }

    void onPreview();
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  {#if open && mutation.kind === "write"}
    <Dialog.Content class="large-blob-write-dialog">
      <ModalScrollArea>
        <Dialog.Header>
          <Dialog.Title>{writeLabel}</Dialog.Title>
        </Dialog.Header>

        <form class="large-blob-write-form" onsubmit={handleSubmit}>
          <Field.FieldGroup>
            <Field.Field data-disabled={fieldsLocked ? "true" : undefined}>
              <Field.FieldTitle id="large-blob-payload-encoding-label">
                {m.payload_encoding()}
              </Field.FieldTitle>
              <ToggleGroup.Root
                type="single"
                value={mutation.draft.encoding}
                variant="outline"
                aria-labelledby="large-blob-payload-encoding-label"
                disabled={fieldsLocked}
                onValueChange={handleEncodingChange}
              >
                <ToggleGroup.Item value="utf8">{m.payload_encoding_utf8()}</ToggleGroup.Item>
                <ToggleGroup.Item value="hex">{m.payload_encoding_hex()}</ToggleGroup.Item>
              </ToggleGroup.Root>
            </Field.Field>

            <Field.Field
              data-invalid={Boolean(validationError)}
              data-disabled={fieldsLocked ? "true" : undefined}
            >
              <Field.FieldLabel for="large-blob-write-payload">{m.payload()}</Field.FieldLabel>
              <Textarea
                id="large-blob-write-payload"
                value={mutation.draft.payload}
                rows={9}
                disabled={fieldsLocked}
                aria-invalid={Boolean(validationError)}
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck={false}
                placeholder={m.large_blob_payload_placeholder()}
                oninput={(event) => onDraftChange({ payload: event.currentTarget.value })}
              />
              {#if validationError}
                <Field.FieldError>{validationMessage(validationError)}</Field.FieldError>
              {:else if parsedPayload?.ok}
                <Field.FieldDescription>
                  {m.byte_payload_prepared({ count: parsedPayload.byteCount })}
                  {#if parsedPayload.byteCount === 0}
                    · {m.payload_empty_hint()}{/if}
                </Field.FieldDescription>
              {/if}
            </Field.Field>
          </Field.FieldGroup>

          {#if failureMessage}
            <Alert.Root
              variant={failureCanceled ? "default" : "destructive"}
              role={failureCanceled ? "status" : "alert"}
            >
              <Alert.Title>
                {failureCanceled
                  ? m.operation_canceled_with_label({
                      label: failedPhase === "previewing" ? m.preview_changes() : writeLabel,
                    })
                  : m.operation_failed()}
              </Alert.Title>
              <Alert.Description>{failureMessage}</Alert.Description>
            </Alert.Root>
          {/if}

          {#if preview}
            {#if operation.phase === "review"}
              <div class="large-blob-write-preview-actions">
                <Button variant="ghost" size="sm" type="button" onclick={onEdit}>
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  {m.edit()}
                </Button>
              </div>
            {/if}

            <LargeBlobMutationPreview {preview} />
          {/if}

          <Dialog.Footer>
            <Button type="submit">
              {operation.phase === "review" ||
              (operation.phase === "error" && operation.failedPhase === "executing")
                ? writeLabel
                : m.preview_changes()}
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
    :global(.large-blob-write-dialog) {
      width: min(46rem, calc(100vw - 2rem));
      max-width: none;
      max-height: calc(100vh - 2rem);
      overflow: hidden;
    }

    .large-blob-write-form {
      display: grid;
      min-width: 0;
      gap: var(--space-4);
    }

    .large-blob-write-preview-actions {
      display: flex;
      justify-content: flex-end;
    }
  }
</style>
