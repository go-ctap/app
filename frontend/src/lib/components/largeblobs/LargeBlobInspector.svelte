<script lang="ts">
  import { Copy, FilePenLine, Trash2 } from "@lucide/svelte";

  import { ErrorCategory } from "../../../../bindings/github.com/go-ctap/kit/model";
  import {
    BlobState,
    DecodeMode,
    LargeBlobKeyState,
  } from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";

  import { copyToClipboard } from "$lib/clipboard";
  import JsonView from "$lib/components/shared/JsonView.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { largeBlobReadReport } from "$lib/ctapkit-results";
  import type { LargeBlobMutationState, LargeBlobReadState } from "$lib/features/largeblobs/state";
  import type { LargeBlobCredentialRow } from "$lib/largeblobs-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: LargeBlobCredentialRow;
    readState: LargeBlobReadState;
    mutation: LargeBlobMutationState;
    decodeMode: DecodeMode;
    writeDisabled: boolean;
    deleteDisabled: boolean;
    onDecodeModeChange: (mode: DecodeMode) => void | Promise<boolean>;
    onWrite: (credentialIDHex: string) => void;
    onDelete: (credentialIDHex: string) => void | Promise<boolean>;
  };

  let {
    row,
    readState,
    mutation,
    decodeMode,
    writeDisabled,
    deleteDisabled,
    onDecodeModeChange,
    onWrite,
    onDelete,
  }: Props = $props();

  let readSelected = $derived(readState.phase !== "idle" && readState.credentialIDHex === row.id);
  let readingSelected = $derived(readSelected && readState.phase === "loading");
  let deletingSelected = $derived(
    mutation.kind === "delete"
      && mutation.credentialIDHex === row.id
      && mutation.phase === "previewing",
  );
  let report = $derived.by(() => {
    if (!readSelected || readState.phase !== "ready") return null;
    return largeBlobReadReport(readState.responseEnvelope);
  });
  let failureMessage = $derived.by(() => {
    if (!readSelected || readState.phase !== "error") return null;
    if (readState.failureReason === "missing-result") return m.operation_missing_result();
    return readState.runtimeError?.message
      ?? readState.responseEnvelope?.error?.message
      ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    readSelected && readState.phase === "error" && (
      readState.runtimeError?.category === ErrorCategory.ErrorCanceled
      || readState.responseEnvelope?.error?.category === ErrorCategory.ErrorCanceled
    ),
  );
  let readKeyAvailable = $derived(
    report?.largeBlobKeyState === LargeBlobKeyState.LargeBlobKeyAvailable,
  );
  let readBlobPresent = $derived(
    Boolean(report?.blobPresent || report?.array.blobState === BlobState.BlobStatePresent),
  );
  const decodeModes = [
    DecodeMode.DecodeModeNone,
    DecodeMode.DecodeModeUTF8,
    DecodeMode.DecodeModeJSON,
    DecodeMode.DecodeModeCBOR,
  ] as const;

  function decodeModeLabel(mode: DecodeMode) {
    switch (mode) {
      case DecodeMode.DecodeModeNone:
        return m.raw_hex();
      case DecodeMode.DecodeModeUTF8:
        return m.payload_encoding_utf8();
      case DecodeMode.DecodeModeJSON:
        return m.decode_json();
      case DecodeMode.DecodeModeCBOR:
        return "CBOR";
      default:
        return mode;
    }
  }

  function handleDecodeModeChange(value: string | string[]) {
    if (Array.isArray(value)) return;
    const mode = decodeModes.find((candidate) => candidate === value);
    if (mode) void onDecodeModeChange(mode);
  }

  function readBlobStateLabel() {
    if (!report) return m.state_unknown();
    if (!readKeyAvailable || report.array.blobState === BlobState.BlobStateUnknownKeyMissing) {
      return m.large_blob_state_key_unavailable();
    }
    return readBlobPresent ? m.large_blob_state_present() : m.large_blob_state_missing();
  }

</script>

<Tooltip.Provider delayDuration={350}>
  <section class="large-blob-inspector" aria-labelledby={`large-blob-details-${row.id}`}>
    <header class="large-blob-inspector-header">
      <div class="large-blob-inspector-heading">
        <h3 id={`large-blob-details-${row.id}`}>{m.large_blob_details()}</h3>
        <span>{row.rpName}</span>
      </div>

      <div class="large-blob-inspector-actions">
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={writeDisabled}
          onclick={() => onWrite(row.id)}
        >
          <FilePenLine data-icon="inline-start" aria-hidden="true" />
          {m.write()}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          type="button"
          disabled={deleteDisabled || deletingSelected}
          onclick={() => onDelete(row.id)}
        >
          {#if deletingSelected}
            <Spinner data-icon="inline-start" aria-hidden="true" />
          {:else}
            <Trash2 data-icon="inline-start" aria-hidden="true" />
          {/if}
          {m.delete()}
        </Button>
      </div>
    </header>

    <div class="large-blob-inspector-content">
      <section class="large-blob-detail-section" aria-labelledby={`large-blob-identity-${row.id}`}>
        <h4 id={`large-blob-identity-${row.id}`}>{m.selected_credential()}</h4>
        <dl class="large-blob-detail-list">
          <div><dt>{m.display_name()}</dt><dd>{row.displayName}</dd></div>
          <div><dt>{m.user_name()}</dt><dd>{row.userName}</dd></div>
          <div><dt>{m.user_id_hex()}</dt><dd><code>{row.userIDHex}</code></dd></div>
          <div><dt>{m.rp_name()}</dt><dd>{row.rpName} <code>{row.rpID}</code></dd></div>
          <div>
            <dt>{m.credential_id()}</dt>
            <dd class="large-blob-copy-value">
              <code>{row.credentialIDHex}</code>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      aria-label={m.copy_label({ label: m.credential_id() })}
                      onclick={() => copyToClipboard(row.credentialIDHex, m.credential_id_copied())}
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top">{m.copy_label({ label: m.credential_id() })}</Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </dd>
          </div>
        </dl>
      </section>

      <section class="large-blob-detail-section" aria-labelledby={`large-blob-read-${row.id}`}>
        <div class="large-blob-read-heading">
          <h4 id={`large-blob-read-${row.id}`}>{m.read_result()}</h4>
          <div class="large-blob-read-actions">
            <ToggleGroup.Root
              type="single"
              value={decodeMode}
              variant="outline"
              size="sm"
              aria-label={m.large_blob_decode_mode()}
              disabled={readingSelected}
              onValueChange={handleDecodeModeChange}
            >
              {#each decodeModes as mode (mode)}
                <ToggleGroup.Item value={mode}>{decodeModeLabel(mode)}</ToggleGroup.Item>
              {/each}
            </ToggleGroup.Root>
            {#if readingSelected}<Spinner aria-label={m.large_blob_read()} />{/if}
          </div>
        </div>

        {#if failureMessage}
          <Alert.Root
            variant={failureCanceled ? "default" : "destructive"}
            role={failureCanceled ? "status" : "alert"}
          >
            <Alert.Title>
              {failureCanceled
                ? m.operation_canceled_with_label({ label: m.large_blob_read() })
                : m.operation_failed()}
            </Alert.Title>
            <Alert.Description>{failureMessage}</Alert.Description>
          </Alert.Root>
        {:else if report}
          <div class="large-blob-read-badges">
            <Badge variant="outline">
              {readKeyAvailable ? m.large_blob_key_available() : m.large_blob_key_missing()}
            </Badge>
            <Badge variant={readBlobPresent ? "secondary" : "outline"}>
              {readBlobStateLabel()}
            </Badge>
            <Badge variant="outline">{m.bytes_count({ count: report.rawByteCount })}</Badge>
          </div>

          {#if readBlobPresent}
            {#if report.rawByteCount === 0}
              <Alert.Root role="status">
                <Alert.Description>{m.decoded_payload_empty()}</Alert.Description>
              </Alert.Root>
            {:else if report.decode.success && report.decode.mode === DecodeMode.DecodeModeUTF8}
              <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code region) -->
              <div
                class="large-blob-decoded-text"
                role="region"
                aria-label={m.payload_encoding_utf8()}
                tabindex="0"
              >
                <pre>{report.decode.decodedText}</pre>
              </div>
            {:else if report.decode.success && (
              report.decode.mode === DecodeMode.DecodeModeJSON
              || report.decode.mode === DecodeMode.DecodeModeCBOR
            )}
              <JsonView
                value={report.decode.decodedValue}
                title={m.decoded_as({ mode: decodeModeLabel(report.decode.mode) })}
                variant="bare"
              />
            {:else}
              {#if report.decode.requested && report.decode.failure}
                <Alert.Root variant="warning" role="status">
                  <Alert.Title>{m.large_blob_decode_failed()}</Alert.Title>
                  <Alert.Description>{report.decode.failure}</Alert.Description>
                </Alert.Root>
              {/if}
              {#if report.rawHex}
              <div class="large-blob-raw-heading">
                <h5>{m.raw_hex()}</h5>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label={m.copy_label({ label: m.raw_hex() })}
                  onclick={() => copyToClipboard(report.rawHex ?? "", m.raw_hex_copied())}
                >
                  <Copy data-icon="inline-start" aria-hidden="true" />
                </Button>
              </div>
              <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code region) -->
              <div class="large-blob-raw-hex" role="region" aria-label={m.raw_hex()} tabindex="0">
                <pre>{report.rawHex}</pre>
              </div>
              {/if}
            {/if}
          {/if}
        {:else}
          <p class="large-blob-read-hint">{m.run_read_blob_hint()}</p>
        {/if}
      </section>
    </div>
  </section>
</Tooltip.Provider>

<style>
@layer blocks {
  .large-blob-inspector {
    contain: inline-size;
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .large-blob-inspector-header,
  .large-blob-read-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
  }

  .large-blob-inspector-header {
    padding: var(--space-3);
  }

  .large-blob-inspector-heading {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
  }

  .large-blob-inspector-heading h3,
  .large-blob-detail-section h4 {
    margin: 0;
    font-size: 0.86rem;
  }

  .large-blob-inspector-heading span,
  .large-blob-read-hint {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .large-blob-inspector-actions,
  .large-blob-read-actions,
  .large-blob-read-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .large-blob-inspector-content {
    display: grid;
    grid-template-columns: minmax(16rem, 0.8fr) minmax(20rem, 1.2fr);
    min-width: 0;
    border-top: 1px solid var(--border);
  }

  .large-blob-detail-section {
    display: grid;
    align-content: start;
    min-width: 0;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .large-blob-detail-section + .large-blob-detail-section {
    border-left: 1px solid var(--border);
  }

  .large-blob-detail-list {
    display: grid;
    min-width: 0;
    gap: var(--space-2);
    margin: 0;
  }

  .large-blob-detail-list > div {
    display: grid;
    grid-template-columns: minmax(6.5rem, 0.45fr) minmax(0, 1fr);
    gap: var(--space-2);
  }

  .large-blob-detail-list dt {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .large-blob-detail-list dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .large-blob-copy-value,
  .large-blob-raw-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    min-width: 0;
  }

  .large-blob-copy-value code {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .large-blob-decoded-text {
    inline-size: 100%;
    max-inline-size: 100%;
    max-block-size: min(18rem, 38dvh);
    min-inline-size: 0;
    overflow-x: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    border: 1px solid var(--border);
    background: var(--muted);
  }

  .large-blob-decoded-text pre {
    margin: 0;
    padding: var(--space-3);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .large-blob-raw-heading h5 {
    margin: 0;
    font-size: 0.78rem;
  }

  .large-blob-raw-hex {
    inline-size: 100%;
    max-inline-size: 100%;
    max-block-size: min(14rem, 30dvh);
    min-inline-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    border: 1px solid var(--border);
    background: var(--muted);
  }

  .large-blob-raw-hex pre {
    min-width: max-content;
    margin: 0;
    padding: var(--space-3);
    font-size: 0.78rem;
    line-height: 1.5;
    white-space: pre;
  }

  @container workspace (max-width: 47.5rem) {
    .large-blob-inspector-content {
      grid-template-columns: minmax(0, 1fr);
    }

    .large-blob-detail-section + .large-blob-detail-section {
      border-top: 1px solid var(--border);
      border-left: 0;
    }
  }
}
</style>
