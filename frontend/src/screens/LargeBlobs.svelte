<script lang="ts">
  import { api, bytesFromText, operationFailed } from "../lib/api";
  import { selectedSelector, pushToast } from "../lib/stores";
  import { asList, reportOf } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";

  let loading = false;
  let envelope: any = null;
  let readResult: any = null;
  let selected: any = null;
  let payload = "";
  let decodeMode = "utf8";
  let preview: any = null;

  $: selector = $selectedSelector;
  $: report = reportOf(envelope);
  $: credentials = asList(report?.credentials);

  async function load() {
    if (!selector) return;
    loading = true;
    envelope = await api.listLargeBlobs(selector);
    loading = false;
  }

  async function readBlob(credential: any) {
    selected = credential;
    readResult = await api.readLargeBlob({ selector, credentialIdHex: credential.credentialIDHex, decodeMode });
  }

  async function previewWrite() {
    preview = await api.writeLargeBlob({
      selector,
      credentialIdHex: selected.credentialIDHex,
      payload: bytesFromText(payload),
      dryRun: true,
    });
  }

  async function executeWrite() {
    await api.writeLargeBlob({
      selector,
      credentialIdHex: selected.credentialIDHex,
      payload: bytesFromText(payload),
      confirmed: true,
      confirmationMessage: "write large blob",
    });
    preview = null;
    await load();
    pushToast("Large blob written");
  }

  async function previewDelete(credential: any) {
    selected = credential;
    preview = await api.deleteLargeBlob({ selector, credentialIdHex: credential.credentialIDHex, dryRun: true });
  }

  async function executeDelete() {
    await api.deleteLargeBlob({
      selector,
      credentialIdHex: selected.credentialIDHex,
      confirmed: true,
      confirmationMessage: "delete large blob",
    });
    preview = null;
    await load();
    pushToast("Large blob deleted");
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Large blobs</p>
    <h1>Data attached to credentials</h1>
    <p class="lede">Read opaque relying-party data, decode it when possible, and preview array mutations before committing bytes back to the token.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector || loading}>{loading ? "Loading" : "Refresh"}</button>
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
    <span>Support: {report?.support?.largeBlobs ? "available" : "unavailable"}</span>
  </div>

  <section class="list-section">
    {#each credentials as credential}
      <article class="row">
        <div>
          <strong>{credential.user?.displayName || credential.user?.name || credential.rp?.id || "Credential"}</strong>
          <code>{credential.credentialIDHex}</code>
          <p>{credential.rp?.id || "unknown RP"} · {credential.blobState} · {credential.blobByteCount || 0} bytes</p>
        </div>
        <div class="actions">
          <button type="button" on:click={() => readBlob(credential)}>Read</button>
          <button type="button" on:click={() => (selected = credential)}>Write</button>
          <button class="danger" type="button" on:click={() => previewDelete(credential)}>Delete</button>
        </div>
      </article>
    {/each}
  </section>
{/if}

{#if readResult}
  <section class="details-grid">
    <div>
      <h2>Read result</h2>
      <label>Decode mode
        <select bind:value={decodeMode}>
          <option value="none">none</option>
          <option value="utf8">utf8</option>
          <option value="json">json</option>
          <option value="cbor">cbor</option>
        </select>
      </label>
      <p>{readResult.result?.report?.blobPresent ? "Blob present" : "No blob present"}</p>
      <p>{readResult.result?.report?.rawByteCount || 0} bytes</p>
      <code>{readResult.result?.report?.rawHex || "no raw hex"}</code>
    </div>
    <JsonView value={readResult.result || readResult} title="Read report" />
  </section>
{/if}

{#if selected}
  <section class="editor-band">
    <h2>Write blob for {selected.rp?.id || selected.credentialIDHex}</h2>
    <textarea bind:value={payload} rows="8" placeholder="UTF-8 payload to store in the large blob"></textarea>
    {#if preview}
      <JsonView value={preview.result || preview} title="Mutation preview" />
    {/if}
    <div class="actions">
      <button type="button" on:click={previewWrite}>Preview write</button>
      <button type="button" on:click={executeWrite} disabled={!preview}>Confirm write</button>
      <button type="button" class="danger" on:click={executeDelete} disabled={!preview}>Confirm delete</button>
      <button class="quiet" type="button" on:click={() => { selected = null; preview = null; }}>Close</button>
    </div>
  </section>
{/if}
