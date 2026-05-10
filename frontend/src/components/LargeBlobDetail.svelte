<script lang="ts">
  import { bytesFromText, operationFailed } from "../lib/api";
  import { reportOf } from "../lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { NativeSelect } from "$lib/components/ui/native-select/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import CopyableId from "./CopyableId.svelte";
  import EmptyState from "./EmptyState.svelte";
  import JsonView from "./JsonView.svelte";
  import StatusBadge from "./StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

  type DetailMode = "read" | "write" | "delete" | "raw";
  type PreviewMode = "write" | "delete" | "";

  interface Props {
    selectedCredential?: any;
    detailMode?: DetailMode;
    readResult?: any;
    preview?: any;
    previewMode?: PreviewMode;
    payload?: string;
    decodeMode?: string;
    readDecodeMode?: string;
    sessionBusy?: boolean;
    largeBlobBusy?: string;
    canConfirmWrite?: boolean;
    canConfirmDelete?: boolean;
    credentialKey: (credential: any) => string;
    readBlob: () => void | Promise<void>;
    previewWrite: () => void | Promise<void>;
    executeWrite: () => void | Promise<void>;
    previewDelete: () => void | Promise<void>;
    executeDelete: () => void | Promise<void>;
    copied: (message: string) => void;
  }

  let {
    selectedCredential = null,
    detailMode = $bindable<DetailMode>("read"),
    readResult = null,
    preview = null,
    previewMode = "",
    payload = $bindable(""),
    decodeMode = $bindable("utf8"),
    readDecodeMode = "",
    sessionBusy = false,
    largeBlobBusy = "",
    canConfirmWrite = false,
    canConfirmDelete = false,
    credentialKey,
    readBlob,
    previewWrite,
    executeWrite,
    previewDelete,
    executeDelete,
    copied,
  }: Props = $props();

  let readReport = $derived(reportOf(readResult));
  let previewOutput = $derived(reportOf(preview));
  let mutationPreview = $derived(previewOutput?.preview || previewOutput?.result || null);
  let mutationWarnings = $derived(Array.isArray(mutationPreview?.warnings) ? mutationPreview.warnings : []);
  let previewJSON = $derived(previewWithoutWarnings(preview?.result || preview));
  let capacityLimit = $derived(mutationPreview?.serializedLargeBlobArrayLimit || mutationPreview?.support?.maxSerializedLargeBlobArray || 0);
  let capacityAfter = $derived(mutationPreview?.serializedLargeBlobArraySizeAfter || 0);
  let capacityRemaining = $derived(capacityLimit ? capacityLimit - capacityAfter : null);
  let decodeDirty = $derived(Boolean(readResult && readDecodeMode && decodeMode !== readDecodeMode));
  let decodeStatus = $derived(readReport?.decode || null);
  let decodedContent = $derived(decodedValue(readReport));
  let decodeFailure = $derived(decodeStatus?.requested && !decodeStatus?.success ? decodeStatus.failure || m.decode_mode_failed() : "");
  let busy = $derived(sessionBusy || Boolean(largeBlobBusy));

  function decodedValue(value: any) {
    return value?.decode?.decodedText ?? value?.decode?.decodedValue ?? value?.decodedJSON ?? value?.decodedText ?? value?.decodedValue ?? value?.text ?? "";
  }

  function hasDecodedValue(value: any) {
    return value !== null && value !== undefined && value !== "";
  }

  function formatDecodedValue(value: any) {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  function previewWithoutWarnings(value: any) {
    if (!value) return value;
    const clone = JSON.parse(JSON.stringify(value));
    if (clone?.warnings) delete clone.warnings;
    if (clone?.preview?.warnings) delete clone.preview.warnings;
    if (clone?.result?.preview?.warnings) delete clone.result.preview.warnings;
    return clone;
  }

  function warningTone(warning: any) {
    return String(warning?.severity || "warning").replaceAll("_", " ");
  }

  function warningMessage(warning: any) {
    return warning?.message || warning?.code || m.review_mutation_before_confirming();
  }

  function handlePayloadKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      previewWrite();
    }
  }
</script>

{#if !selectedCredential}
  <EmptyState eyebrow={m.selection()} variant="compact" title={m.choose_credential()} message={m.choose_credential_message()} />
{:else}
  <Card.Root class="border-0 bg-transparent p-0 shadow-none ring-0">
    <Card.Header class="px-0 pt-0">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="grid gap-1">
          <Card.Description>{m.selected_credential()}</Card.Description>
          <Card.Title>{selectedCredential.user?.displayName || selectedCredential.user?.name || selectedCredential.rp?.id || m.credential()}</Card.Title>
          <Card.Description>{selectedCredential.rp?.id || m.unknown_rp()}</Card.Description>
        </div>
        <StatusBadge value={selectedCredential.blobState || "unknown"} label={selectedCredential.blobState || m.state_unknown()} />
      </div>
      <CopyableId label={m.credential_id()} value={credentialKey(selectedCredential)} copied={() => copied(m.credential_id_copied())} />
    </Card.Header>

    <Card.Content class="grid gap-4 px-0 pb-0">
  <Tabs.Root bind:value={detailMode}>
    <Tabs.List aria-label={m.workspace_mode()}>
      <Tabs.Trigger value="read">{m.read()}</Tabs.Trigger>
      <Tabs.Trigger value="write">{m.write()}</Tabs.Trigger>
      <Tabs.Trigger value="delete">{m.delete()}</Tabs.Trigger>
      <Tabs.Trigger value="raw">{m.raw()}</Tabs.Trigger>
    </Tabs.List>

  <Tabs.Content value="read" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header class="flex-row items-start justify-between gap-3">
        <div class="grid gap-1">
          <Card.Title>{m.read_result()}</Card.Title>
          <Card.Description>{m.read_result_description()}</Card.Description>
        </div>
        <Button onclick={readBlob} disabled={busy}>{m.read_blob()}</Button>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Field>
        <Field.Label>{m.decode_mode()}</Field.Label>
        <NativeSelect bind:value={decodeMode}>
          <option value="none">none</option>
          <option value="utf8">utf8</option>
          <option value="json">json</option>
          <option value="cbor">cbor</option>
        </NativeSelect>
      </Field.Field>
      {#if decodeDirty}
        <Alert><AlertDescription>{m.decode_mode_changed()}</AlertDescription></Alert>
      {/if}
      {#if operationFailed(readResult)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(readResult)}</AlertDescription></Alert>
      {:else if readResult}
        <div class="flex flex-wrap gap-2">
          <Badge variant="secondary">{readReport?.blobPresent ? m.blob_present() : m.no_blob_present()}</Badge>
          <Badge variant="outline">{m.bytes_count({ count: readReport?.rawByteCount || 0 })}</Badge>
          <Badge variant="outline">{m.decoded_as({ mode: readDecodeMode || decodeMode })}</Badge>
        </div>
        {#if hasDecodedValue(decodedContent)}
          <pre class="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-sm">{formatDecodedValue(decodedContent)}</pre>
        {:else if decodeFailure}
          <Alert><AlertDescription>{m.decode_failed({ failure: decodeFailure })}</AlertDescription></Alert>
        {:else if decodeStatus?.requested && decodeStatus?.success}
          <Alert><AlertDescription>{m.decoded_payload_empty()}</AlertDescription></Alert>
        {/if}
        <CopyableId label={m.raw_hex()} value={readReport?.rawHex || ""} empty={m.no_raw_hex()} copied={() => copied(m.raw_hex_copied())} />
        <details class="rounded-md border bg-card p-4">
          <summary>{m.raw_read_report()}</summary>
          <JsonView value={readResult.result || readResult} title={m.read_report()} variant="bare" />
        </details>
      {:else}
        <p class="text-sm text-muted-foreground">{m.run_read_blob_hint()}</p>
      {/if}
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="write" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>{m.write_payload()}</Card.Title>
        <Card.Description>{m.write_payload_description()}</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Field>
        <Field.Label>{m.payload()}</Field.Label>
        <Textarea bind:value={payload} rows={8} placeholder={m.large_blob_payload_placeholder()} onkeydown={handlePayloadKeydown} />
      </Field.Field>
      <div class="flex flex-wrap gap-2">
        <Badge variant="outline">{m.bytes_count({ count: bytesFromText(payload).length })}</Badge>
        <Badge variant="outline">{m.characters_count({ count: payload.length })}</Badge>
      </div>
      {#if operationFailed(preview)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(preview)}</AlertDescription></Alert>
      {/if}
      {#if preview && previewMode === "write"}
        <Alert><AlertDescription>{m.write_preview_ready()}</AlertDescription></Alert>
        {#if mutationPreview}
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">{m.bytes_before({ count: mutationPreview.serializedLargeBlobArraySizeBefore || 0 })}</Badge>
            <Badge variant="outline">{m.bytes_after({ count: mutationPreview.serializedLargeBlobArraySizeAfter || 0 })}</Badge>
            {#if capacityLimit}
              <Badge variant="outline">{m.bytes_remaining({ count: Math.max(capacityRemaining || 0, 0) })}</Badge>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="grid gap-2" aria-label={m.preview_warnings()}>
            {#each mutationWarnings as warning (warning?.code || warningMessage(warning))}
              <Alert variant={warning?.severity === "destructive" ? "destructive" : "default"}>
                <Badge variant={warning?.severity === "destructive" ? "destructive" : "secondary"}>{warningTone(warning)}</Badge>
                <AlertDescription>{warningMessage(warning)}</AlertDescription>
              </Alert>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title={m.mutation_preview()} variant="bare" />
      {/if}
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onclick={previewWrite} disabled={busy}>{m.preview_write()}</Button>
        <Button onclick={executeWrite} disabled={busy || !canConfirmWrite}>{m.confirm_write()}</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="delete" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>{m.delete_blob()}</Card.Title>
        <Card.Description>{m.delete_blob_description()}</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      {#if operationFailed(preview)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(preview)}</AlertDescription></Alert>
      {/if}
      {#if preview && previewMode === "delete"}
        <Alert><AlertDescription>{m.delete_preview_ready()}</AlertDescription></Alert>
        {#if mutationPreview}
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">{m.bytes_before({ count: mutationPreview.serializedLargeBlobArraySizeBefore || 0 })}</Badge>
            <Badge variant="outline">{m.bytes_after({ count: mutationPreview.serializedLargeBlobArraySizeAfter || 0 })}</Badge>
            {#if capacityLimit}
              <Badge variant="outline">{m.bytes_remaining({ count: Math.max(capacityRemaining || 0, 0) })}</Badge>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="grid gap-2" aria-label={m.preview_warnings()}>
            {#each mutationWarnings as warning (warning?.code || warningMessage(warning))}
              <Alert variant={warning?.severity === "destructive" ? "destructive" : "default"}>
                <Badge variant={warning?.severity === "destructive" ? "destructive" : "secondary"}>{warningTone(warning)}</Badge>
                <AlertDescription>{warningMessage(warning)}</AlertDescription>
              </Alert>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title={m.delete_preview()} variant="bare" />
      {/if}
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onclick={previewDelete} disabled={busy}>{m.preview_delete()}</Button>
        <Button variant="destructive" onclick={executeDelete} disabled={busy || !canConfirmDelete}>{m.confirm_delete()}</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="raw">
    <JsonView value={selectedCredential} title={m.large_blob_credential_json()} />
  </Tabs.Content>
  </Tabs.Root>
    </Card.Content>
  </Card.Root>
{/if}
