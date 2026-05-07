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
  export let credentialKey: (credential: any) => string;
  export let readBlob: () => void | Promise<void>;
  export let previewWrite: () => void | Promise<void>;
  export let executeWrite: () => void | Promise<void>;
  export let previewDelete: () => void | Promise<void>;
  export let executeDelete: () => void | Promise<void>;
  export let copied: (message: string) => void;

  $: readReport = reportOf(readResult);
  $: decodeDirty = Boolean(readResult && readDecodeMode && decodeMode !== readDecodeMode);

  function decodedValue(value: any) {
    return value?.decodedJSON ?? value?.decodedText ?? value?.decodedValue ?? value?.text ?? "";
  }

  function handlePayloadKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      previewWrite();
    }
  }
</script>

{#if !selectedCredential}
  <EmptyState title="Choose a credential" message="Select a row to open its read, write, delete, and raw inspection workspace." />
{:else}
  <div class="detail-heading">
    <div>
      <p class="eyebrow">Selected credential</p>
      <h2>{selectedCredential.user?.displayName || selectedCredential.user?.name || selectedCredential.rp?.id || "Credential"}</h2>
    </div>
    <StatusBadge value={selectedCredential.blobState || "unknown"} label={selectedCredential.blobState || "unknown"} />
  </div>
  <CopyableId label="Credential ID" value={credentialKey(selectedCredential)} on:copied={() => copied("Credential ID copied")} />

  <div class="segmented" aria-label="Workspace mode">
    <button class:active={detailMode === "read"} type="button" on:click={() => (detailMode = "read")}>Read</button>
    <button class:active={detailMode === "write"} type="button" on:click={() => (detailMode = "write")}>Write</button>
    <button class:active={detailMode === "delete"} type="button" on:click={previewDelete}>Delete</button>
    <button class:active={detailMode === "raw"} type="button" on:click={() => (detailMode = "raw")}>Raw</button>
  </div>

  {#if detailMode === "read"}
    <section class="detail-section">
      <div class="section-heading">
        <h3>Read result</h3>
        <button type="button" on:click={readBlob} disabled={sessionBusy}>Read blob</button>
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
        {#if decodedValue(readReport)}
          <pre>{typeof decodedValue(readReport) === "string" ? decodedValue(readReport) : JSON.stringify(decodedValue(readReport), null, 2)}</pre>
        {/if}
        <CopyableId label="Raw hex" value={readReport?.rawHex || ""} empty="no raw hex" on:copied={() => copied("Raw hex copied")} />
        <details class="technical">
          <summary>Raw read report</summary>
          <JsonView value={readResult.result || readResult} title="Read report" />
        </details>
      {:else}
        <p class="muted">Run Read to inspect blob presence, byte count, decoded content, and raw hex for this credential.</p>
      {/if}
    </section>
  {:else if detailMode === "write"}
    <section class="detail-section">
      <h3>Write payload</h3>
      <textarea bind:value={payload} rows="8" placeholder="UTF-8 payload to store in the large blob" on:keydown={handlePayloadKeydown}></textarea>
      <div class="metric-band">
        <span>{bytesFromText(payload).length} bytes</span>
        <span>{payload.length} characters</span>
      </div>
      {#if operationFailed(preview)}
        <div class="notice danger">{operationFailed(preview)}</div>
      {:else if preview && previewMode === "write"}
        <div class="notice">Preview ready. Confirm write to update the selected credential blob.</div>
        <JsonView value={preview.result || preview} title="Mutation preview" />
      {/if}
      <div class="actions">
        <button type="button" on:click={previewWrite}>Preview write</button>
        <button type="button" on:click={executeWrite} disabled={previewMode !== "write" || !preview}>Confirm write</button>
      </div>
    </section>
  {:else if detailMode === "delete"}
    <section class="detail-section">
      <h3>Delete blob</h3>
      <p class="muted">Preview the deletion before removing the large blob bytes from this credential.</p>
      {#if operationFailed(preview)}
        <div class="notice danger">{operationFailed(preview)}</div>
      {:else if preview && previewMode === "delete"}
        <div class="notice">Delete preview ready. Confirm delete only if the selected mutation is expected.</div>
        <JsonView value={preview.result || preview} title="Delete preview" />
      {/if}
      <div class="actions">
        <button class="danger" type="button" on:click={previewDelete}>Preview delete</button>
        <button class="danger" type="button" on:click={executeDelete} disabled={previewMode !== "delete" || !preview}>Confirm delete</button>
      </div>
    </section>
  {:else}
    <JsonView value={selectedCredential} title="Large blob credential JSON" />
  {/if}
{/if}
