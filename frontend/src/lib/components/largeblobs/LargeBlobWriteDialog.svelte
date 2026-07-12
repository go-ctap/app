<script lang="ts">
  import { Pencil } from "@lucide/svelte";

  import { ErrorCategory } from "../../../../bindings/github.com/go-ctap/kit/model";

  import LargeBlobMutationPreview from "$lib/components/largeblobs/LargeBlobMutationPreview.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { largeBlobMutationPreview } from "$lib/ctapkit-results";
  import type {
    LargeBlobMutationState,
    LargeBlobWriteDraft,
  } from "$lib/features/largeblobs/state";
  import {
    parseLargeBlobPayload,
    type LargeBlobPayloadEncoding,
    type LargeBlobPayloadValidationError,
  } from "$lib/largeblobs-payload";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mutation: LargeBlobMutationState;
    retryAllowed: boolean;
    onDraftChange: (patch: Partial<LargeBlobWriteDraft>) => void;
    onEncodingChange: (encoding: LargeBlobPayloadEncoding) => void;
    onEdit: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let {
    mutation,
    retryAllowed,
    onDraftChange,
    onEncodingChange,
    onEdit,
    onPreview,
    onConfirm,
    onRetry,
    onClose,
  }: Props = $props();

  let open = $derived(mutation.kind === "write");
  let busy = $derived(
    mutation.kind === "write"
      && (mutation.phase === "previewing" || mutation.phase === "executing"),
  );
  let fieldsLocked = $derived(
    mutation.kind === "write" && mutation.phase !== "editing",
  );
  let preview = $derived.by(() => {
    if (mutation.kind !== "write") return null;
    if (mutation.phase === "review" || mutation.phase === "executing") {
      return largeBlobMutationPreview(mutation.previewEnvelope);
    }
    if (mutation.phase === "error") {
      return largeBlobMutationPreview(mutation.previewEnvelope ?? mutation.responseEnvelope);
    }
    return null;
  });
  let validationError = $derived.by((): LargeBlobPayloadValidationError | null => {
    if (mutation.kind !== "write") return null;
    if (mutation.phase === "editing" || mutation.phase === "error") {
      return mutation.validationError;
    }
    return null;
  });
  let parsedPayload = $derived.by(() => {
    if (mutation.kind !== "write") return null;
    return parseLargeBlobPayload(mutation.draft.payload, mutation.draft.encoding);
  });
  let failureMessage = $derived.by(() => {
    if (mutation.kind !== "write" || mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return mutation.runtimeError?.message
      ?? mutation.responseEnvelope?.error?.message
      ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.kind === "write" && mutation.phase === "error" && (
      mutation.runtimeError?.category === ErrorCategory.ErrorCanceled
      || mutation.responseEnvelope?.error?.category === ErrorCategory.ErrorCanceled
    ),
  );
  let failedPhase = $derived(mutation.phase === "error" ? mutation.failedPhase : null);

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
    if (!next && !busy) onClose();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (mutation.kind !== "write" || busy) return;
    if (mutation.phase === "review") {
      void onConfirm();
      return;
    }
    if (mutation.phase === "error") {
      void onRetry();
      return;
    }
    void onPreview();
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  {#if mutation.kind === "write"}
    <Dialog.Content class="large-blob-write-dialog" showCloseButton={!busy}>
      <Dialog.Header>
        <Dialog.Title>{m.large_blob_write()}</Dialog.Title>
        <Dialog.Description>{m.write_payload_description()}</Dialog.Description>
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
                {#if parsedPayload.byteCount === 0} · {m.payload_empty_hint()}{/if}
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
                ? m.operation_canceled_with_label({ label: failedPhase === "previewing" ? m.write_preview() : m.large_blob_write() })
                : m.operation_failed()}
            </Alert.Title>
            <Alert.Description>{failureMessage}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if preview}
          <div class="large-blob-write-preview-heading">
            <Badge variant="outline">{m.preview_ready()}</Badge>
            {#if mutation.phase === "review" || mutation.phase === "error"}
              <Button variant="ghost" size="sm" type="button" onclick={onEdit}>
                <Pencil data-icon="inline-start" aria-hidden="true" />
                {m.edit()}
              </Button>
            {/if}
          </div>
          <LargeBlobMutationPreview {preview} />
        {/if}

        <Dialog.Footer>
          <Button
            type="submit"
            disabled={busy || (mutation.phase === "error" && !retryAllowed)}
          >
            {#if busy}<Spinner data-icon="inline-start" aria-hidden="true" />{/if}
            {mutation.phase === "review"
              ? m.confirm_write()
              : mutation.phase === "error"
                ? m.retry()
                : m.preview_write()}
          </Button>
          <Button variant="outline" type="button" disabled={busy} onclick={onClose}>
            {m.cancel()}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
@layer blocks {
  :global(.large-blob-write-dialog) {
    width: min(46rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: auto;
  }

  .large-blob-write-form {
    display: grid;
    min-width: 0;
    gap: var(--space-4);
  }

  .large-blob-write-preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
}
</style>
