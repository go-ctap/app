<script lang="ts">
  import { bytesFromText, operationFailed } from "../lib/api";
  import { reportOf } from "../lib/format";
  import CopyableId from "./CopyableId.svelte";
  import EmptyState from "./EmptyState.svelte";
  import JsonView from "./JsonView.svelte";
  import StatusBadge from "./StatusBadge.svelte";

  export let selectedCredential: any = null;
  export let detailMode: "read" | "write" | "delete" | "raw" = "read";
  export let readResult: any = null;
  export let preview: any = null;
  export let previewMode: "write" | "delete" | "" = "";
  export let payload = "";
  export let decodeMode = "utf8";
  export let readDecodeMode = "";
  export let sessionBusy = false;
  export let largeBlobBusy = "";
  export let canConfirmWrite = false;
  export let canConfirmDelete = false;
  export let credentialKey: (credential: any) => string;
  export let readBlob: () => void | Promise<void>;
  export let previewWrite: () => void | Promise<void>;
  export let executeWrite: () => void | Promise<void>;
  export let previewDelete: () => void | Promise<void>;
  export let executeDelete: () => void | Promise<void>;
  export let copied: (message: string) => void;

  $: readReport = reportOf(readResult);
  $: previewOutput = reportOf(preview);
  $: mutationPreview = previewOutput?.preview || previewOutput?.result || null;
  $: mutationWarnings = Array.isArray(mutationPreview?.warnings) ? mutationPreview.warnings : [];
  $: previewJSON = previewWithoutWarnings(preview?.result || preview);
  $: capacityLimit = mutationPreview?.serializedLargeBlobArrayLimit || mutationPreview?.support?.maxSerializedLargeBlobArray || 0;
  $: capacityAfter = mutationPreview?.serializedLargeBlobArraySizeAfter || 0;
  $: capacityRemaining = capacityLimit ? capacityLimit - capacityAfter : null;
  $: decodeDirty = Boolean(readResult && readDecodeMode && decodeMode !== readDecodeMode);
  $: decodeStatus = readReport?.decode || null;
  $: decodedContent = decodedValue(readReport);
  $: decodeFailure = decodeStatus?.requested && !decodeStatus?.success ? decodeStatus.failure || "Selected decode mode could not decode this blob." : "";
  $: busy = sessionBusy || Boolean(largeBlobBusy);

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
  <div class="large-blob-detail-heading">
    <div class="large-blob-detail-title">
      <p class="eyebrow">Selected credential</p>
      <h2>{selectedCredential.user?.displayName || selectedCredential.user?.name || selectedCredential.rp?.id || "Credential"}</h2>
      <p>{selectedCredential.rp?.id || "unknown RP"}</p>
    </div>
    <StatusBadge value={selectedCredential.blobState || "unknown"} label={selectedCredential.blobState || "unknown"} />
  </div>
  <CopyableId label="Credential ID" value={credentialKey(selectedCredential)} on:copied={() => copied("Credential ID copied")} />

  <div class="large-blob-mode-tabs" aria-label="Workspace mode">
    <button class:active={detailMode === "read"} type="button" on:click={() => (detailMode = "read")}>Read</button>
    <button class:active={detailMode === "write"} type="button" on:click={() => (detailMode = "write")}>Write</button>
    <button class:active={detailMode === "delete"} type="button" on:click={() => (detailMode = "delete")}>Delete</button>
    <button class:active={detailMode === "raw"} type="button" on:click={() => (detailMode = "raw")}>Raw</button>
  </div>

  {#if detailMode === "read"}
    <section class="large-blob-detail-section">
      <div class="large-blob-section-heading">
        <div>
          <h3>Read result</h3>
          <p class="muted">Blob presence, byte count, decoded content, and raw hex.</p>
        </div>
        <button type="button" on:click={readBlob} disabled={busy}>Read blob</button>
      </div>
      <label>Decode mode
        <select bind:value={decodeMode}>
          <option value="none">none</option>
          <option value="utf8">utf8</option>
          <option value="json">json</option>
          <option value="cbor">cbor</option>
        </select>
      </label>
      {#if decodeDirty}
        <div class="notice">Decode mode changed. Re-read the blob to update the decoded content.</div>
      {/if}
      {#if operationFailed(readResult)}
        <div class="notice danger">{operationFailed(readResult)}</div>
      {:else if readResult}
        <div class="metric-band">
          <span>{readReport?.blobPresent ? "Blob present" : "No blob present"}</span>
          <span>{readReport?.rawByteCount || 0} bytes</span>
          <span>Decoded as {readDecodeMode || decodeMode}</span>
        </div>
        {#if hasDecodedValue(decodedContent)}
          <pre>{formatDecodedValue(decodedContent)}</pre>
        {:else if decodeFailure}
          <div class="notice">Decode failed: {decodeFailure}</div>
        {:else if decodeStatus?.requested && decodeStatus?.success}
          <div class="notice">Decoded payload is empty.</div>
        {/if}
        <CopyableId label="Raw hex" value={readReport?.rawHex || ""} empty="no raw hex" on:copied={() => copied("Raw hex copied")} />
        <details class="technical">
          <summary>Raw read report</summary>
          <JsonView value={readResult.result || readResult} title="Read report" variant="bare" />
        </details>
      {:else}
        <p class="muted">Run Read to inspect blob presence, byte count, decoded content, and raw hex for this credential.</p>
      {/if}
    </section>
  {:else if detailMode === "write"}
    <section class="large-blob-detail-section">
      <div class="large-blob-section-heading">
        <div>
          <h3>Write payload</h3>
          <p class="muted">Preview the payload before writing it to this credential.</p>
        </div>
      </div>
      <textarea bind:value={payload} rows="8" placeholder="UTF-8 payload to store in the large blob" on:keydown={handlePayloadKeydown}></textarea>
      <div class="metric-band">
        <span>{bytesFromText(payload).length} bytes</span>
        <span>{payload.length} characters</span>
      </div>
      {#if operationFailed(preview)}
        <div class="notice danger">{operationFailed(preview)}</div>
      {/if}
      {#if preview && previewMode === "write"}
        <div class="notice">Preview ready. Confirm write to update the selected credential blob.</div>
        {#if mutationPreview}
          <div class="metric-band">
            <span>{mutationPreview.serializedLargeBlobArraySizeBefore || 0} bytes before</span>
            <span>{mutationPreview.serializedLargeBlobArraySizeAfter || 0} bytes after</span>
            {#if capacityLimit}
              <span>{Math.max(capacityRemaining || 0, 0)} bytes remaining</span>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="warning-list" aria-label="Preview warnings">
            {#each mutationWarnings as warning}
              <div class:destructive={warning?.severity === "destructive"} class="warning-item">
                <span>{warningTone(warning)}</span>
                <p>{warningMessage(warning)}</p>
              </div>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title="Mutation preview" variant="bare" />
      {/if}
      <div class="large-blob-action-row">
        <button type="button" on:click={previewWrite} disabled={busy}>Preview write</button>
        <button type="button" on:click={executeWrite} disabled={busy || !canConfirmWrite}>Confirm write</button>
      </div>
    </section>
  {:else if detailMode === "delete"}
    <section class="large-blob-detail-section">
      <div class="large-blob-section-heading">
        <div>
          <h3>Delete blob</h3>
          <p class="muted">Preview deletion before removing the blob bytes from this credential.</p>
        </div>
      </div>
      {#if operationFailed(preview)}
        <div class="notice danger">{operationFailed(preview)}</div>
      {/if}
      {#if preview && previewMode === "delete"}
        <div class="notice">Delete preview ready. Confirm delete only if the selected mutation is expected.</div>
        {#if mutationPreview}
          <div class="metric-band">
            <span>{mutationPreview.serializedLargeBlobArraySizeBefore || 0} bytes before</span>
            <span>{mutationPreview.serializedLargeBlobArraySizeAfter || 0} bytes after</span>
            {#if capacityLimit}
              <span>{Math.max(capacityRemaining || 0, 0)} bytes remaining</span>
            {/if}
          </div>
        {/if}
        {#if mutationWarnings.length}
          <div class="warning-list" aria-label="Preview warnings">
            {#each mutationWarnings as warning}
              <div class:destructive={warning?.severity === "destructive"} class="warning-item">
                <span>{warningTone(warning)}</span>
                <p>{warningMessage(warning)}</p>
              </div>
            {/each}
          </div>
        {/if}
        <JsonView value={previewJSON} title="Delete preview" variant="bare" />
      {/if}
      <div class="large-blob-action-row">
        <button class="quiet" type="button" on:click={previewDelete} disabled={busy}>Preview delete</button>
        <button class="danger" type="button" on:click={executeDelete} disabled={busy || !canConfirmDelete}>Confirm delete</button>
      </div>
    </section>
  {:else}
    <JsonView value={selectedCredential} title="Large blob credential JSON" />
  {/if}
{/if}
