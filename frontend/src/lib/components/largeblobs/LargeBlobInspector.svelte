<script lang="ts">
  import { Copy, FilePenLine, Trash2 } from "@lucide/svelte";

  import {
    DecodeMode,
    ReadState,
  } from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";

  import { copyToClipboard } from "$lib/clipboard";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import JsonView from "$lib/components/shared/JsonView.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Separator } from "$lib/components/ui/separator";
  import { Spinner } from "$lib/components/ui/spinner";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { largeBlobReadReport } from "$lib/ctapkit-results";
  import type { LargeBlobDecodeState, LargeBlobReadState } from "$lib/features/largeblobs/state";
  import type { LargeBlobEntryRow } from "$lib/largeblobs-presentation";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";
  import { advancedMode } from "$lib/preferences";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: LargeBlobEntryRow;
    readState: LargeBlobReadState;
    decodeState: LargeBlobDecodeState;
    decodeMode: DecodeMode;
    mutationDisabled: boolean;
    onDecodeModeChange: (mode: DecodeMode) => void | Promise<boolean>;
    onWrite: (entryIndex: number) => void;
    onDelete: (entryIndex: number) => void | Promise<boolean>;
  };

  let {
    row,
    readState,
    decodeState,
    decodeMode,
    mutationDisabled,
    onDecodeModeChange,
    onWrite,
    onDelete,
  }: Props = $props();

  let readSelected = $derived(readState.phase !== "idle" && readState.entryIndex === row.index);
  let readingSelected = $derived(readSelected && readState.phase === "loading");
  let decodeSelected = $derived(
    decodeState.phase !== "idle" && decodeState.entryIndex === row.index,
  );
  let decodingSelected = $derived(decodeSelected && decodeState.phase === "loading");

  let report = $derived.by(() => {
    if (!readSelected || readState.phase !== "ready") return null;

    return largeBlobReadReport(readState.responseEnvelope);
  });

  let readFailureMessage = $derived.by(() => {
    if (!readSelected || readState.phase !== "error") return null;

    return (
      localizeFailure(readState.runtimeError) ??
      localizeFailure(readState.responseEnvelope?.error) ??
      m.operation_failed()
    );
  });

  let readFailureCanceled = $derived(
    readSelected &&
      readState.phase === "error" &&
      (isCanceledFailure(readState.runtimeError) ||
        isCanceledFailure(readState.responseEnvelope?.error)),
  );

  let decodeFailureMessage = $derived.by(() => {
    if (!decodeSelected || decodeState.phase !== "error") return null;

    return (
      localizeFailure(decodeState.runtimeError) ??
      localizeFailure(decodeState.responseEnvelope?.error) ??
      m.operation_failed()
    );
  });

  let blobPresent = $derived(report?.state === ReadState.ReadStatePresent);
  let writeActionDisabled = $derived(mutationDisabled || !row.hasTarget || !blobPresent || !report);
  let deleteActionDisabled = $derived(mutationDisabled || !row.hasTarget);

  const decodeModes = [
    DecodeMode.DecodeModeUTF8,
    DecodeMode.DecodeModeJSON,
    DecodeMode.DecodeModeCBOR,
  ] as const;

  function decodeModeLabel(mode: DecodeMode) {
    switch (mode) {
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
</script>

<Tooltip.Provider delayDuration={350}>
  <section class="large-blob-inspector" aria-labelledby={`large-blob-details-${row.index}`}>
    <header class="large-blob-inspector-header">
      <div class="large-blob-inspector-heading">
        <h3 id={`large-blob-details-${row.index}`}>
          {m.large_blob_entry_number({ index: row.index })}
        </h3>
        <span>{row.hasTarget ? row.rpName : m.large_blob_no_target()}</span>
      </div>

      {#if row.hasTarget}
        <div class="large-blob-inspector-actions">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={writeActionDisabled}
            onclick={() => onWrite(row.index)}
          >
            <FilePenLine data-icon="inline-start" aria-hidden="true" />
            {m.edit()}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            disabled={deleteActionDisabled}
            onclick={() => onDelete(row.index)}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            {m.delete()}
          </Button>
        </div>
      {/if}
    </header>

    <div class="large-blob-inspector-content">
      <section class="large-blob-detail-section" aria-labelledby={`large-blob-entry-${row.index}`}>
        <h4 id={`large-blob-entry-${row.index}`}>{m.large_blob_entry_details()}</h4>

        <dl class="large-blob-detail-list">
          <div>
            <dt>{m.large_blob_ciphertext()}</dt>
            <dd>{m.bytes_count({ count: row.ciphertextByteCount })}</dd>
          </div>
          <div>
            <dt>{m.large_blob_declared_payload()}</dt>
            <dd>{m.bytes_count({ count: row.declaredPayloadByteCount })}</dd>
          </div>
          <div>
            <dt>{m.large_blob_payload_size()}</dt>
            <dd>
              {row.payloadByteCount === null
                ? m.not_reported()
                : m.bytes_count({ count: row.payloadByteCount })}
            </dd>
          </div>

          {#if row.hasTarget}
            <div>
              <dt>{m.rp_name()}</dt>
              <dd>{row.rpName} <code>{row.rpID}</code></dd>
            </div>
            <div>
              <dt>{m.user_name()}</dt>
              <dd>{row.displayName} <span>{row.userName}</span></dd>
            </div>
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
                        onclick={() =>
                          copyToClipboard(row.credentialIDHex, m.credential_id_copied())}
                      >
                        <Copy data-icon="inline-start" aria-hidden="true" />
                      </Button>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top">
                    {m.copy_label({ label: m.credential_id() })}
                  </Tooltip.Content>
                </Tooltip.Root>
              </dd>
            </div>
          {:else}
            <div>
              <dt>{m.large_blob_target()}</dt>
              <dd>{m.large_blob_cleanup_only()}</dd>
            </div>
          {/if}
        </dl>
      </section>

      <section class="large-blob-detail-section" aria-labelledby={`large-blob-read-${row.index}`}>
        <div class="large-blob-read-heading">
          <h4 id={`large-blob-read-${row.index}`}>{m.read_result()}</h4>

          {#if row.hasTarget && blobPresent}
            <ToggleGroup.Root
              type="single"
              value={decodeMode}
              variant="outline"
              size="sm"
              aria-label={m.large_blob_decode_mode()}
              disabled={readingSelected || decodingSelected}
              onValueChange={handleDecodeModeChange}
            >
              {#each decodeModes as mode (mode)}
                <ToggleGroup.Item value={mode}>{decodeModeLabel(mode)}</ToggleGroup.Item>
              {/each}
            </ToggleGroup.Root>
          {/if}
        </div>

        {#if !row.hasTarget}
          <Alert.Root role="status">
            <Alert.Description>{m.large_blob_cleanup_only()}</Alert.Description>
          </Alert.Root>
        {:else if readFailureMessage}
          <Alert.Root
            variant={readFailureCanceled ? "default" : "destructive"}
            role={readFailureCanceled ? "status" : "alert"}
          >
            <Alert.Title>
              {readFailureCanceled
                ? m.operation_canceled_with_label({ label: m.large_blob_read() })
                : m.operation_failed()}
            </Alert.Title>
            <Alert.Description>{readFailureMessage}</Alert.Description>
          </Alert.Root>
        {:else if readingSelected}
          <p class="large-blob-read-hint">
            <Spinner data-icon="inline-start" />
            {m.waiting_for_authenticator_response()}
          </p>
        {:else if report}
          <div class="large-blob-read-badges">
            <Badge variant={blobPresent ? "secondary" : "outline"}>
              {blobPresent ? m.large_blob_state_present() : m.large_blob_state_missing()}
            </Badge>
            <Badge variant="outline">{m.bytes_count({ count: report.rawByteCount })}</Badge>
          </div>

          {#if blobPresent}
            {#if decodeFailureMessage}
              <Alert.Root variant="warning" role="alert">
                <Alert.Title>{m.large_blob_decode_failed()}</Alert.Title>
                <Alert.Description>{decodeFailureMessage}</Alert.Description>
              </Alert.Root>
            {:else if decodingSelected}
              <p class="large-blob-read-hint">
                <Spinner data-icon="inline-start" />
                {m.large_blob_decoding()}
              </p>
            {:else if report.rawByteCount === 0}
              <Alert.Root role="status">
                <Alert.Description>{m.decoded_payload_empty()}</Alert.Description>
              </Alert.Root>
            {:else if decodeSelected && decodeState.phase === "ready"}
              {#if decodeState.value.mode === DecodeMode.DecodeModeUTF8}
                <ScrollArea
                  class="large-blob-decoded-text"
                  orientation="both"
                  viewportProps={{
                    role: "region",
                    "aria-label": m.payload_encoding_utf8(),
                    tabindex: 0,
                  }}
                >
                  <pre>{decodeState.value.text}</pre>
                </ScrollArea>
              {:else}
                <div class="large-blob-decoded-json">
                  <JsonView
                    value={decodeState.value.value}
                    title={m.decoded_as({ mode: decodeModeLabel(decodeState.value.mode) })}
                    variant="bare"
                  />
                </div>
              {/if}
            {/if}

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
            <ScrollArea
              class="large-blob-raw-hex"
              orientation="both"
              viewportProps={{ role: "region", "aria-label": m.raw_hex(), tabindex: 0 }}
            >
              <pre>{report.rawHex ?? ""}</pre>
            </ScrollArea>
          {/if}
        {:else}
          <p class="large-blob-read-hint">{m.waiting_for_authenticator_response()}</p>
        {/if}
      </section>
    </div>

    {#if $advancedMode}
      <Separator />
      <div class="large-blob-raw">
        <JsonDisclosure value={row.raw} title={m.large_blob_entry_details()} />
      </div>
    {/if}
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

    .large-blob-inspector-heading,
    .large-blob-detail-section {
      display: grid;
      min-width: 0;
      gap: var(--space-3);
    }

    .large-blob-inspector-heading {
      gap: var(--space-1);
    }

    .large-blob-inspector-heading h3,
    .large-blob-detail-section h4,
    .large-blob-raw-heading h5 {
      margin: 0;
      font-size: 0.86rem;
    }

    .large-blob-inspector-heading span,
    .large-blob-read-hint {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .large-blob-inspector-actions,
    .large-blob-read-badges,
    .large-blob-read-hint {
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
      align-content: start;
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
      grid-template-columns: minmax(7.5rem, 0.45fr) minmax(0, 1fr);
      gap: var(--space-2);
    }

    .large-blob-detail-list dt {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .large-blob-detail-list dd {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .large-blob-copy-value,
    .large-blob-raw-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-1);
      min-width: 0;
    }

    .large-blob-raw {
      min-width: 0;
      padding: var(--space-3);
    }

    :global(.large-blob-decoded-text),
    :global(.large-blob-decoded-text > [data-scroll-area-viewport]),
    :global(.large-blob-raw-hex),
    :global(.large-blob-raw-hex > [data-scroll-area-viewport]) {
      inline-size: 100%;
      max-inline-size: 100%;
      max-block-size: min(18rem, 38dvh);
      min-inline-size: 0;
    }

    :global(.large-blob-decoded-text),
    :global(.large-blob-raw-hex) {
      border: 1px solid var(--border);
      background: var(--muted);
    }

    :global(.large-blob-decoded-text) pre,
    :global(.large-blob-raw-hex) pre {
      margin: 0;
      padding: var(--space-3);
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .large-blob-decoded-json {
      display: grid;
      min-width: 0;
      padding-block: var(--space-2);
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
