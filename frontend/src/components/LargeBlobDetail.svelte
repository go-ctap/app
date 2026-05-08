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
  let decodeFailure = $derived(decodeStatus?.requested && !decodeStatus?.success ? decodeStatus.failure || "Selected decode mode could not decode this blob." : "");
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
    return warning?.message || warning?.code || "Review this mutation before confirming.";
  }

  function handlePayloadKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      previewWrite();
    }
  }
</script>

{#if !selectedCredential}
  <EmptyState eyebrow="Selection" variant="compact" title="Choose a credential" message="Select a row to open its read, write, delete, and raw inspection workspace." />
{:else}
  <Card.Root class="border-0 bg-transparent p-0 shadow-none ring-0">
    <Card.Header class="px-0 pt-0">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="grid gap-1">
          <Card.Description>Selected credential</Card.Description>
          <Card.Title>{selectedCredential.user?.displayName || selectedCredential.user?.name || selectedCredential.rp?.id || "Credential"}</Card.Title>
          <Card.Description>{selectedCredential.rp?.id || "unknown RP"}</Card.Description>
        </div>
        <StatusBadge value={selectedCredential.blobState || "unknown"} label={selectedCredential.blobState || "unknown"} />
      </div>
      <CopyableId label="Credential ID" value={credentialKey(selectedCredential)} copied={() => copied("Credential ID copied")} />
    </Card.Header>

    <Card.Content class="grid gap-4 px-0 pb-0">
  <Tabs.Root bind:value={detailMode}>
    <Tabs.List aria-label="Workspace mode">
      <Tabs.Trigger value="read">Read</Tabs.Trigger>
      <Tabs.Trigger value="write">Write</Tabs.Trigger>
      <Tabs.Trigger value="delete">Delete</Tabs.Trigger>
      <Tabs.Trigger value="raw">Raw</Tabs.Trigger>
    </Tabs.List>

  <Tabs.Content value="read" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header class="flex-row items-start justify-between gap-3">
        <div class="grid gap-1">
          <Card.Title>Read result</Card.Title>
          <Card.Description>Blob presence, byte count, decoded content, and raw hex.</Card.Description>
        </div>
        <Button onclick={readBlob} disabled={busy}>Read blob</Button>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Field>
        <Field.Label>Decode mode</Field.Label>
        <NativeSelect bind:value={decodeMode}>
          <option value="none">none</option>
          <option value="utf8">utf8</option>
          <option value="json">json</option>
          <option value="cbor">cbor</option>
        </NativeSelect>
      </Field.Field>
      {#if decodeDirty}
        <Alert><AlertDescription>Decode mode changed. Re-read the blob to update the decoded content.</AlertDescription></Alert>
      {/if}
      {#if operationFailed(readResult)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(readResult)}</AlertDescription></Alert>
      {:else if readResult}
        <div class="flex flex-wrap gap-2">
          <Badge variant="secondary">{readReport?.blobPresent ? "Blob present" : "No blob present"}</Badge>
          <Badge variant="outline">{readReport?.rawByteCount || 0} bytes</Badge>
          <Badge variant="outline">Decoded as {readDecodeMode || decodeMode}</Badge>
        </div>
        {#if hasDecodedValue(decodedContent)}
          <pre class="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-sm">{formatDecodedValue(decodedContent)}</pre>
        {:else if decodeFailure}
          <Alert><AlertDescription>Decode failed: {decodeFailure}</AlertDescription></Alert>
        {:else if decodeStatus?.requested && decodeStatus?.success}
          <Alert><AlertDescription>Decoded payload is empty.</AlertDescription></Alert>
        {/if}
        <CopyableId label="Raw hex" value={readReport?.rawHex || ""} empty="no raw hex" copied={() => copied("Raw hex copied")} />
        <details class="technical">
          <summary>Raw read report</summary>
          <JsonView value={readResult.result || readResult} title="Read report" variant="bare" />
        </details>
      {:else}
        <p class="muted">Run Read to inspect blob presence, byte count, decoded content, and raw hex for this credential.</p>
      {/if}
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="write" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>Write payload</Card.Title>
        <Card.Description>Preview the payload before writing it to this credential.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Field>
        <Field.Label>Payload</Field.Label>
        <Textarea bind:value={payload} rows={8} placeholder="UTF-8 payload to store in the large blob" onkeydown={handlePayloadKeydown} />
      </Field.Field>
      <div class="flex flex-wrap gap-2">
        <Badge variant="outline">{bytesFromText(payload).length} bytes</Badge>
        <Badge variant="outline">{payload.length} characters</Badge>
      </div>
      {#if operationFailed(preview)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(preview)}</AlertDescription></Alert>
      {/if}
      {#if preview && previewMode === "write"}
        <Alert><AlertDescription>Preview ready. Confirm write to update the selected credential blob.</AlertDescription></Alert>
        {#if mutationPreview}
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">{mutationPreview.serializedLargeBlobArraySizeBefore || 0} bytes before</Badge>
            <Badge variant="outline">{mutationPreview.serializedLargeBlobArraySizeAfter || 0} bytes after</Badge>
            {#if capacityLimit}
              <Badge variant="outline">{Math.max(capacityRemaining || 0, 0)} bytes remaining</Badge>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="grid gap-2" aria-label="Preview warnings">
            {#each mutationWarnings as warning (warning?.code || warningMessage(warning))}
              <Alert variant={warning?.severity === "destructive" ? "destructive" : "default"}>
                <Badge variant={warning?.severity === "destructive" ? "destructive" : "secondary"}>{warningTone(warning)}</Badge>
                <AlertDescription>{warningMessage(warning)}</AlertDescription>
              </Alert>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title="Mutation preview" variant="bare" />
      {/if}
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onclick={previewWrite} disabled={busy}>Preview write</Button>
        <Button onclick={executeWrite} disabled={busy || !canConfirmWrite}>Confirm write</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="delete" class="grid gap-4">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>Delete blob</Card.Title>
        <Card.Description>Preview deletion before removing the blob bytes from this credential.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      {#if operationFailed(preview)}
        <Alert variant="destructive"><AlertDescription>{operationFailed(preview)}</AlertDescription></Alert>
      {/if}
      {#if preview && previewMode === "delete"}
        <Alert><AlertDescription>Delete preview ready. Confirm delete only if the selected mutation is expected.</AlertDescription></Alert>
        {#if mutationPreview}
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">{mutationPreview.serializedLargeBlobArraySizeBefore || 0} bytes before</Badge>
            <Badge variant="outline">{mutationPreview.serializedLargeBlobArraySizeAfter || 0} bytes after</Badge>
            {#if capacityLimit}
              <Badge variant="outline">{Math.max(capacityRemaining || 0, 0)} bytes remaining</Badge>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="grid gap-2" aria-label="Preview warnings">
            {#each mutationWarnings as warning (warning?.code || warningMessage(warning))}
              <Alert variant={warning?.severity === "destructive" ? "destructive" : "default"}>
                <Badge variant={warning?.severity === "destructive" ? "destructive" : "secondary"}>{warningTone(warning)}</Badge>
                <AlertDescription>{warningMessage(warning)}</AlertDescription>
              </Alert>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title="Delete preview" variant="bare" />
      {/if}
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onclick={previewDelete} disabled={busy}>Preview delete</Button>
        <Button variant="destructive" onclick={executeDelete} disabled={busy || !canConfirmDelete}>Confirm delete</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="raw">
    <JsonView value={selectedCredential} title="Large blob credential JSON" />
  </Tabs.Content>
  </Tabs.Root>
    </Card.Content>
  </Card.Root>
{/if}
