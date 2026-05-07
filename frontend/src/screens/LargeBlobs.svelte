<script lang="ts">
  import { api, bytesFromText, operationFailed } from "../lib/api";
  import { selectedSelector, selectionVersion, pushToast, sessionBusy, setStatusOutcome, summarizeEnvelope } from "../lib/stores";
  import { asList, reportOf, stateLabel } from "../lib/format";
  import CopyableId from "../components/CopyableId.svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import LargeBlobDetail from "../components/LargeBlobDetail.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let loading = false;
  let envelope: any = null;
  let readResult: any = null;
  let selectedId = "";
  let payload = "";
  let decodeMode = "utf8";
  let readDecodeMode = "";
  let preview: any = null;
  let previewMode: "write" | "delete" | "" = "";
  let detailMode: "read" | "write" | "delete" | "raw" = "read";

  $: selector = $selectedSelector;
  $: if ($selectionVersion) resetState();
  $: report = reportOf(envelope);
  $: credentials = asList(report?.credentials);
  $: selectedCredential = credentials.find((credential: any) => credentialKey(credential) === selectedId) || null;

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  function credentialKey(credential: any) {
    return credential?.credentialIDHex || credential?.credentialIdHex || credential?.id || "";
  }

  function resetState() {
    envelope = null;
    readResult = null;
    selectedId = "";
    payload = "";
    preview = null;
    previewMode = "";
    detailMode = "read";
  }

  function selectCredential(credential: any, mode: "read" | "write" | "delete" | "raw" = "read") {
    selectedId = credentialKey(credential);
    detailMode = mode;
    preview = null;
    previewMode = "";
  }

  async function load() {
    if (!selector) return;
    loading = true;
    try {
      envelope = await api.listLargeBlobs(selector);
      summarizeEnvelope("Large blob list", envelope, "large-blob-workspace", load);
    } catch (error) {
      envelope = failureEnvelope(error);
      summarizeEnvelope("Large blob list", envelope, "large-blob-workspace", load);
    } finally {
      loading = false;
    }
  }

  async function readBlob(credential = selectedCredential) {
    if (!credential) return;
    selectCredential(credential, "read");
    try {
      readResult = await api.readLargeBlob({ selector, credentialIdHex: credentialKey(credential), decodeMode });
      readDecodeMode = decodeMode;
      summarizeEnvelope("Large blob read", readResult, "large-blob-detail", () => readBlob(credential));
    } catch (error) {
      readResult = failureEnvelope(error);
      summarizeEnvelope("Large blob read", readResult, "large-blob-detail", () => readBlob(credential));
    }
  }

  async function previewWrite() {
    if (!selectedCredential) return;
    detailMode = "write";
    previewMode = "write";
    try {
      preview = await api.writeLargeBlob({
        selector,
        credentialIdHex: credentialKey(selectedCredential),
        payload: bytesFromText(payload),
        dryRun: true,
      });
      setStatusOutcome({ tone: "info", title: "Write preview ready", message: `${bytesFromText(payload).length} byte payload prepared.`, detailId: "large-blob-detail" });
    } catch (error) {
      preview = failureEnvelope(error);
      summarizeEnvelope("Write preview", preview, "large-blob-detail", previewWrite);
    }
  }

  async function executeWrite() {
    if (!selectedCredential) return;
    const credential = selectedCredential;
    let result: any = null;
    try {
      result = await api.writeLargeBlob({
        selector,
        credentialIdHex: credentialKey(credential),
        payload: bytesFromText(payload),
        confirmed: true,
        confirmationMessage: "write large blob",
      });
      preview = null;
      previewMode = "";
      await load();
      await readBlob(credential);
      pushToast("Large blob written");
      summarizeEnvelope("Large blob write", result, "large-blob-detail");
    } catch (error) {
      result = failureEnvelope(error);
      summarizeEnvelope("Large blob write", result, "large-blob-detail", executeWrite);
    }
  }

  async function previewDelete(credential: any) {
    selectCredential(credential, "delete");
    previewMode = "delete";
    try {
      preview = await api.deleteLargeBlob({ selector, credentialIdHex: credentialKey(credential), dryRun: true });
      setStatusOutcome({ tone: "warning", title: "Delete preview ready", message: "Review the mutation before confirming delete.", detailId: "large-blob-detail" });
    } catch (error) {
      preview = failureEnvelope(error);
      summarizeEnvelope("Delete preview", preview, "large-blob-detail", () => previewDelete(credential));
    }
  }

  async function executeDelete() {
    if (!selectedCredential) return;
    const credential = selectedCredential;
    let result: any = null;
    try {
      result = await api.deleteLargeBlob({
        selector,
        credentialIdHex: credentialKey(credential),
        confirmed: true,
        confirmationMessage: "delete large blob",
      });
      preview = null;
      previewMode = "";
      await load();
      readResult = null;
      detailMode = "read";
      pushToast("Large blob deleted");
      summarizeEnvelope("Large blob delete", result, "large-blob-detail");
    } catch (error) {
      result = failureEnvelope(error);
      summarizeEnvelope("Large blob delete", result, "large-blob-detail", executeDelete);
    }
  }

  function copyToast(message: string) {
    pushToast(message);
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Large blobs</p>
    <h1>Credential blob workspace</h1>
    <p class="lede">Select a resident credential, then read, edit, preview, or delete its attached data without leaving the row context.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector || loading || $sessionBusy}>{loading ? "Loading" : "Refresh"}</button>
</section>

{#if !selector}
  <EmptyState title="No token selected" message="Select an authenticator to inspect large blobs." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if credentials.length === 0}
  <EmptyState title="No large-blob state loaded" message="Refresh to map resident credentials to large-blob state." />
{:else}
  <div class="summary-line">
    <span>{report?.array?.blobCount || 0} blobs</span>
    <span>{report?.array?.matchedBlobCount || 0} matched</span>
    <StatusBadge value={report?.support?.largeBlobs} label={`Support: ${stateLabel(report?.support?.largeBlobs)}`} />
  </div>

  <section id="large-blob-workspace" class="large-blob-workspace">
    <div class="list-section credential-list">
      <div class="section-heading">
        <h2>Credentials</h2>
        <span class="muted">{credentials.length} row(s)</span>
      </div>
      {#each credentials as credential}
        <article class:selected={credentialKey(credential) === selectedId} class="credential-row">
          <button class="row-select" type="button" on:click={() => selectCredential(credential)}>
            <span class="row-main">
              <strong>{credential.user?.displayName || credential.user?.name || credential.rp?.id || "Credential"}</strong>
              <span class="row-meta">
                <span>{credential.rp?.id || "unknown RP"}</span>
                <StatusBadge value={credential.blobState || "unknown"} label={credential.blobState || "unknown"} />
                <span>{credential.blobByteCount || 0} bytes</span>
              </span>
            </span>
          </button>
          <div class="actions">
            <button type="button" on:click={() => readBlob(credential)} disabled={$sessionBusy}>Read</button>
            <button type="button" on:click={() => selectCredential(credential, "write")} disabled={$sessionBusy}>Write</button>
            <button class="danger" type="button" on:click={() => previewDelete(credential)} disabled={$sessionBusy}>Delete</button>
          </div>
          {#if credentialKey(credential) === selectedId}
            <div class="inline-detail">
              <section class="credential-detail">
                <LargeBlobDetail
                  bind:detailMode
                  bind:payload
                  bind:decodeMode
                  {readResult}
                  {preview}
                  {previewMode}
                  {readDecodeMode}
                  {selectedCredential}
                  sessionBusy={$sessionBusy}
                  {credentialKey}
                  readBlob={() => readBlob()}
                  {previewWrite}
                  {executeWrite}
                  previewDelete={() => previewDelete(selectedCredential)}
                  {executeDelete}
                  copied={copyToast}
                />
              </section>
            </div>
            {/if}
        </article>
      {/each}
    </div>

    <aside id="large-blob-detail" class="credential-detail">
      <LargeBlobDetail
        bind:detailMode
        bind:payload
        bind:decodeMode
        {readResult}
        {preview}
        {previewMode}
        {readDecodeMode}
        {selectedCredential}
        sessionBusy={$sessionBusy}
        {credentialKey}
        readBlob={() => readBlob()}
        {previewWrite}
        {executeWrite}
        previewDelete={() => previewDelete(selectedCredential)}
        {executeDelete}
        copied={copyToast}
      />
    </aside>
  </section>
{/if}
