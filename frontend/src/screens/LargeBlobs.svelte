<script lang="ts">
  import { get } from "svelte/store";
  import { api, bytesFromText, operationFailed } from "../lib/api";
  import { beginOperation, clearSharedCredentialInventory, emptyLargeBlobState, finishOperation, largeBlobScreenCache, selectedSelector, selectionVersion, pushToast, sessionBusy, sessionStatus, setLargeBlobScreenState, setStatusOutcome, sharedCredentialInventoryCache, sharedInventoryFor, summarizeEnvelope, updateSharedCredentialInventory } from "../lib/stores";
  import { asList, reportOf, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import LargeBlobDetail from "../components/LargeBlobDetail.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let loading = false;
  let largeBlobBusy: "" | "list" | "read" | "preview-write" | "write" | "preview-delete" | "delete" | "preview-gc" | "gc" = "";
  let envelope: any = null;
  let readResult: any = null;
  let readCredentialId = "";
  let selectedId = "";
  let payload = "";
  let payloadByCredential: Record<string, string> = {};
  let decodeMode = "utf8";
  let readDecodeMode = "";
  let preview: any = null;
  let previewBinding: any = null;
  let previewMode: "write" | "delete" | "" = "";
  let gcPreview: any = null;
  let gcResult: any = null;
  let gcPreviewBinding: any = null;
  let detailMode: "read" | "write" | "delete" | "raw" = "read";
  let cacheSelector = "";
  let cacheVersion = -1;
  let operationEpoch = 0;
  let listVersion = 0;
  let warmReloadKey = "";

  $: selector = $selectedSelector;
  $: if (selector !== cacheSelector) restoreState(selector);
  $: if ($selectionVersion !== cacheVersion) restoreState(selector);
  $: if (selector && $sharedCredentialInventoryCache && !loading) hydrateFromSharedInventory(selector);
  $: if (selector && selector === cacheSelector) persistState();
  $: report = reportOf(envelope);
  $: credentials = asList(report?.credentials);
  $: largeBlobLoaded = Boolean(envelope && !operationFailed(envelope));
  $: selectedCredential = credentials.find((credential: any) => credentialKey(credential) === selectedId) || null;
  $: activeReadResult = readCredentialId === selectedId ? readResult : null;
  $: activePreview = previewMatchesCurrent() ? preview : null;
  $: canConfirmWrite = previewMode === "write" && Boolean(activePreview) && !operationFailed(activePreview) && previewMatches("write");
  $: canConfirmDelete = previewMode === "delete" && Boolean(activePreview) && !operationFailed(activePreview) && previewMatches("delete");
  $: canConfirmGarbageCollect = Boolean(gcPreview) && !operationFailed(gcPreview) && gcPreviewBinding?.selector === selector && gcPreviewBinding?.listVersion === listVersion;
  $: hasUnmatchedBlobs = (report?.array?.unmatchedBlobCount || 0) > 0;
  $: gcPreviewOutput = reportOf(gcPreview);
  $: gcPreviewData = gcPreviewOutput?.preview || gcPreviewOutput;
  $: gcResultOutput = reportOf(gcResult);
  $: gcResultData = gcResultOutput?.result || gcResultOutput;

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  function credentialKey(credential: any) {
    return credential?.credentialIDHex || credential?.credentialIdHex || credential?.id || "";
  }

  function restoreState(nextSelector: string) {
    const cached = get(largeBlobScreenCache)[nextSelector] || emptyLargeBlobState();
    envelope = cached.envelope;
    readResult = cached.readResult;
    readCredentialId = cached.readCredentialId || (cached.readResult ? cached.selectedId : "");
    selectedId = cached.selectedId;
    payloadByCredential = cached.payloadByCredential || {};
    if (cached.selectedId && cached.payload && !payloadByCredential[cached.selectedId]) {
      payloadByCredential = { ...payloadByCredential, [cached.selectedId]: cached.payload };
    }
    payload = cached.selectedId ? payloadByCredential[cached.selectedId] || "" : "";
    decodeMode = cached.decodeMode;
    readDecodeMode = cached.readDecodeMode;
    preview = cached.preview;
    previewBinding = cached.previewBinding || null;
    previewMode = cached.previewMode;
    detailMode = cached.detailMode;
    clearGarbageCollectState();
    listVersion += 1;
    cacheSelector = nextSelector;
    cacheVersion = $selectionVersion;
    hydrateFromSharedInventory(nextSelector);
  }

  function persistState() {
    setLargeBlobScreenState(selector, {
      envelope,
      readResult,
      readCredentialId,
      selectedId,
      payload,
      payloadByCredential: payloadMapWithCurrent(),
      decodeMode,
      readDecodeMode,
      preview,
      previewBinding,
      previewMode,
      detailMode,
    });
  }

  function selectCredential(credential: any, mode: "read" | "write" | "delete" | "raw" = "read") {
    saveCurrentPayload();
    operationEpoch++;
    const nextId = credentialKey(credential);
    selectedId = nextId;
    payload = payloadByCredential[nextId] || "";
    detailMode = mode;
    preview = null;
    previewBinding = null;
    previewMode = "";
  }

  function payloadMapWithCurrent() {
    if (!selectedId) return { ...payloadByCredential };
    return { ...payloadByCredential, [selectedId]: payload };
  }

  function saveCurrentPayload() {
    payloadByCredential = payloadMapWithCurrent();
  }

  function payloadSignature(value: string) {
    const bytes = bytesFromText(value);
    return `${bytes.length}:${bytes.join(".")}`;
  }

  function bindPreview(operation: "write" | "delete", credentialId: string, payloadHash = "", boundDecodeMode = decodeMode) {
    previewBinding = {
      credentialId,
      operation,
      payloadHash: operation === "write" ? payloadHash : "",
      decodeMode: boundDecodeMode,
    };
  }

  function previewMatches(operation: "write" | "delete") {
    if (!selectedCredential || !previewBinding) return false;
    return (
      previewBinding.operation === operation &&
      previewBinding.credentialId === credentialKey(selectedCredential) &&
      previewBinding.payloadHash === (operation === "write" ? payloadSignature(payload) : "") &&
      previewBinding.decodeMode === decodeMode
    );
  }

  function previewMatchesCurrent() {
    if (previewMode !== "write" && previewMode !== "delete") return false;
    return previewMatches(previewMode);
  }

  function credentialBlobCleared(nextEnvelope: any, credentialId: string) {
    if (operationFailed(nextEnvelope)) return false;
    const nextReport = reportOf(nextEnvelope);
    const nextCredentials = asList(nextReport?.credentials);
    const credential = nextCredentials.find((item: any) => credentialKey(item) === credentialId);
    if (!credential) return true;
    const byteCount = Number(credential.blobByteCount ?? credential.rawByteCount ?? 0);
    const state = String(credential.blobState || "").toLowerCase().replaceAll("_", "-");
    return byteCount === 0 || ["absent", "empty", "missing", "no-blob", "none", "not-present"].includes(state);
  }

  function beginAction(action: typeof largeBlobBusy) {
    if (largeBlobBusy || $sessionBusy) return false;
    largeBlobBusy = action;
    return true;
  }

  function endAction(action: typeof largeBlobBusy) {
    if (largeBlobBusy === action) {
      largeBlobBusy = "";
    }
  }

  function clearGarbageCollectState(options: { result?: boolean } = {}) {
    gcPreview = null;
    gcPreviewBinding = null;
    if (options.result !== false) {
      gcResult = null;
    }
  }

  function markListLoaded() {
    listVersion += 1;
  }

  function credentialsOnlyBlobEnvelope(inventory: any) {
    return {
      result: {
        report: {
          credentials: inventory?.managementCredentials || [],
          array: {
            blobCount: 0,
            matchedBlobCount: 0,
            unmatchedBlobCount: 0,
          },
          support: { largeBlobs: "cached credentials" },
        },
      },
    };
  }

  function hydrateFromSharedInventory(nextSelector: string) {
    if (!nextSelector || nextSelector !== cacheSelector || envelope) return;
    const inventory = sharedInventoryFor(nextSelector);
    if (!inventory) return;
    if (inventory.hasBlobFields && inventory.blobEnvelope) {
      envelope = inventory.blobEnvelope;
      markListLoaded();
      return;
    }
    if (inventory.hasManagementFields && inventory.managementCredentials.length > 0) {
      envelope = credentialsOnlyBlobEnvelope(inventory);
      markListLoaded();
      if ($sessionStatus.state === "ready" && warmReloadKey !== `${nextSelector}:${inventory.loadedAt}`) {
        warmReloadKey = `${nextSelector}:${inventory.loadedAt}`;
        void load({ warm: true });
      }
    }
  }

  async function load(options: { preserveOnError?: boolean; quiet?: boolean; clearCleanup?: boolean; warm?: boolean } = {}) {
    if (!selector || loading || !beginAction("list")) return;
    const token = ++operationEpoch;
    loading = true;
    if (options.clearCleanup !== false) {
      clearGarbageCollectState();
    }
    try {
      if (!options.quiet) beginOperation(options.warm ? "Large blob warm reload" : "Large blob list", "large-blob-workspace");
      const result = await api.listLargeBlobs(selector);
      if (token !== operationEpoch) return;
      if (!options.preserveOnError || !operationFailed(result)) {
        envelope = result;
        if (!operationFailed(result)) {
          markListLoaded();
          updateSharedCredentialInventory(selector, result, "largeBlobs");
        }
      }
      if (!options.quiet) summarizeEnvelope(options.warm ? "Large blob warm reload" : "Large blob list", result, "large-blob-workspace", () => load());
      return result;
    } catch (error) {
      if (token !== operationEpoch) return;
      const failure = failureEnvelope(error);
      if (!options.preserveOnError) {
        envelope = failure;
      }
      if (!options.quiet) summarizeEnvelope(options.warm ? "Large blob warm reload" : "Large blob list", failure, "large-blob-workspace", () => load());
      return failure;
    } finally {
      loading = false;
      endAction("list");
    }
  }

  async function readBlob(credential = selectedCredential) {
    if (!credential || !beginAction("read")) return;
    selectCredential(credential, "read");
    const token = ++operationEpoch;
    const credentialId = credentialKey(credential);
    try {
      beginOperation("Large blob read", "large-blob-detail");
      const result = await api.readLargeBlob({ selector, credentialIdHex: credentialId, decodeMode });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      readResult = result;
      readCredentialId = credentialId;
      readDecodeMode = decodeMode;
      summarizeEnvelope("Large blob read", readResult, "large-blob-detail", () => readBlob(credential));
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      readResult = failureEnvelope(error);
      readCredentialId = credentialId;
      summarizeEnvelope("Large blob read", readResult, "large-blob-detail", () => readBlob(credential));
    } finally {
      endAction("read");
    }
  }

  async function previewWrite() {
    if (!selectedCredential || !beginAction("preview-write")) return;
    detailMode = "write";
    previewMode = "write";
    const token = ++operationEpoch;
    const credentialId = credentialKey(selectedCredential);
    const capturedPayload = payload;
    const capturedPayloadBytes = bytesFromText(capturedPayload);
    const capturedPayloadHash = payloadSignature(capturedPayload);
    const capturedDecodeMode = decodeMode;
    try {
      beginOperation("Write preview", "large-blob-detail");
      const result = await api.writeLargeBlob({
        selector,
        credentialIdHex: credentialId,
        payload: capturedPayloadBytes,
        dryRun: true,
      });
      if (token !== operationEpoch || credentialKey(selectedCredential) !== credentialId) return;
      preview = result;
      bindPreview("write", credentialId, capturedPayloadHash, capturedDecodeMode);
      if (operationFailed(preview)) {
        summarizeEnvelope("Write preview", preview, "large-blob-detail", previewWrite);
      } else {
        finishOperation();
        setStatusOutcome({ tone: "info", title: "Write preview ready", message: `${capturedPayloadBytes.length} byte payload prepared.`, detailId: "large-blob-detail" });
      }
    } catch (error) {
      if (token !== operationEpoch || credentialKey(selectedCredential) !== credentialId) return;
      preview = failureEnvelope(error);
      bindPreview("write", credentialId, capturedPayloadHash, capturedDecodeMode);
      summarizeEnvelope("Write preview", preview, "large-blob-detail", previewWrite);
    } finally {
      endAction("preview-write");
    }
  }

  async function executeWrite() {
    if (!selectedCredential || !canConfirmWrite || !beginAction("write")) return;
    const credential = selectedCredential;
    const token = ++operationEpoch;
    const credentialId = credentialKey(credential);
    let result: any = null;
    try {
      beginOperation("Large blob write", "large-blob-detail");
      result = await api.writeLargeBlob({
        selector,
        credentialIdHex: credentialId,
        payload: bytesFromText(payload),
        confirmed: true,
        confirmationMessage: "write large blob",
      });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = null;
      previewBinding = null;
      previewMode = "";
      clearGarbageCollectState();
      clearSharedCredentialInventory(selector);
      endAction("write");
      await load({ clearCleanup: false });
      pushToast("Large blob written");
      summarizeEnvelope("Large blob write", result, "large-blob-detail");
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      result = failureEnvelope(error);
      summarizeEnvelope("Large blob write", result, "large-blob-detail", executeWrite);
    } finally {
      endAction("write");
    }
  }

  async function previewDelete(credential: any) {
    if (!credential || !beginAction("preview-delete")) return;
    selectCredential(credential, "delete");
    previewMode = "delete";
    const token = ++operationEpoch;
    const credentialId = credentialKey(credential);
    try {
      beginOperation("Delete preview", "large-blob-detail");
      const result = await api.deleteLargeBlob({ selector, credentialIdHex: credentialId, dryRun: true });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = result;
      bindPreview("delete", credentialId);
      if (operationFailed(preview)) {
        summarizeEnvelope("Delete preview", preview, "large-blob-detail", () => previewDelete(credential));
      } else {
        finishOperation();
        setStatusOutcome({ tone: "warning", title: "Delete preview ready", message: "Review the mutation before confirming delete.", detailId: "large-blob-detail" });
      }
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = failureEnvelope(error);
      bindPreview("delete", credentialId);
      summarizeEnvelope("Delete preview", preview, "large-blob-detail", () => previewDelete(credential));
    } finally {
      endAction("preview-delete");
    }
  }

  async function executeDelete() {
    if (!selectedCredential || !canConfirmDelete || !beginAction("delete")) return;
    const credential = selectedCredential;
    const token = ++operationEpoch;
    const credentialId = credentialKey(credential);
    let result: any = null;
    try {
      beginOperation("Large blob delete", "large-blob-detail");
      result = await api.deleteLargeBlob({
        selector,
        credentialIdHex: credentialId,
        confirmed: true,
        confirmationMessage: "delete large blob",
      });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = null;
      previewBinding = null;
      previewMode = "";
      clearGarbageCollectState();
      clearSharedCredentialInventory(selector);
      endAction("delete");
      const deleteProblem = operationFailed(result);
      const refreshed = await load({ preserveOnError: true, quiet: Boolean(deleteProblem), clearCleanup: false });
      readResult = null;
      readCredentialId = "";
      detailMode = "read";
      if (deleteProblem) {
        if (refreshed && credentialBlobCleared(refreshed, credentialId)) {
          pushToast("Large blob deleted");
          finishOperation();
          setStatusOutcome({
            tone: "warning",
            title: "Large blob delete applied",
            message: "The blob is gone after refresh, but CTAP reported an issue during the delete response.",
            detailId: "large-blob-detail",
          });
        } else {
          summarizeEnvelope("Large blob delete", result, "large-blob-detail", executeDelete);
        }
      } else {
        pushToast("Large blob deleted");
        summarizeEnvelope("Large blob delete", result, "large-blob-detail");
      }
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      result = failureEnvelope(error);
      endAction("delete");
      clearGarbageCollectState();
      clearSharedCredentialInventory(selector);
      const refreshed = await load({ preserveOnError: true, quiet: true, clearCleanup: false });
      if (refreshed && credentialBlobCleared(refreshed, credentialId)) {
        preview = null;
        previewBinding = null;
        previewMode = "";
        readResult = null;
        readCredentialId = "";
        detailMode = "read";
        pushToast("Large blob deleted");
        finishOperation();
        setStatusOutcome({
          tone: "warning",
          title: "Large blob delete applied",
          message: "The blob is gone after refresh, but CTAP reported an issue during the delete response.",
          detailId: "large-blob-detail",
        });
      } else {
        summarizeEnvelope("Large blob delete", result, "large-blob-detail", executeDelete);
      }
    } finally {
      endAction("delete");
    }
  }

  async function previewGarbageCollect() {
    if (!selector || !beginAction("preview-gc")) return;
    const token = ++operationEpoch;
    const previewSelector = selector;
    const previewListVersion = listVersion;
    try {
      beginOperation("Large blob cleanup preview", "large-blob-workspace");
      const result = await api.garbageCollectLargeBlobs({ selector: previewSelector, dryRun: true });
      if (token !== operationEpoch || selector !== previewSelector || listVersion !== previewListVersion) return;
      gcPreview = result;
      gcPreviewBinding = { selector: previewSelector, listVersion: previewListVersion };
      gcResult = null;
      summarizeEnvelope("Large blob cleanup preview", gcPreview, "large-blob-workspace", previewGarbageCollect);
    } catch (error) {
      if (token !== operationEpoch || selector !== previewSelector || listVersion !== previewListVersion) return;
      gcPreview = failureEnvelope(error);
      gcPreviewBinding = { selector: previewSelector, listVersion: previewListVersion };
      summarizeEnvelope("Large blob cleanup preview", gcPreview, "large-blob-workspace", previewGarbageCollect);
    } finally {
      endAction("preview-gc");
    }
  }

  async function executeGarbageCollect() {
    if (!selector || !canConfirmGarbageCollect || !beginAction("gc")) return;
    const token = ++operationEpoch;
    try {
      beginOperation("Large blob cleanup", "large-blob-workspace");
      const result = await api.garbageCollectLargeBlobs({
        selector,
        confirmed: true,
        confirmationMessage: "garbage collect unmatched large blob entries",
      });
      if (token !== operationEpoch) return;
      gcPreview = null;
      gcPreviewBinding = null;
      clearSharedCredentialInventory(selector);
      endAction("gc");
      await load({ clearCleanup: false });
      gcResult = result;
      pushToast("Large blob cleanup complete");
      summarizeEnvelope("Large blob cleanup", gcResult, "large-blob-workspace");
    } catch (error) {
      if (token !== operationEpoch) return;
      gcResult = failureEnvelope(error);
      summarizeEnvelope("Large blob cleanup", gcResult, "large-blob-workspace", executeGarbageCollect);
    } finally {
      endAction("gc");
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
    <p class="lede">Select a resident credential, then inspect and manage its attached blob from the workspace.</p>
  </div>
  <button type="button" on:click={() => load()} disabled={!selector || Boolean(largeBlobBusy) || $sessionBusy}>{loading ? "Reloading blobs" : "Reload blobs"}</button>
</section>

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator to inspect large blobs." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if !largeBlobLoaded}
  <EmptyState eyebrow="Workspace ready" variant="workspace" title="No large-blob state loaded" message="Reload blobs to map resident credentials to large-blob state. The workspace will show matched credentials, blob bytes, and cleanup state here." />
{:else}
  <div class="large-blob-summary" aria-label="Large blob summary">
    <span><strong>{report?.array?.blobCount || 0}</strong> blobs</span>
    <span><strong>{report?.array?.matchedBlobCount || 0}</strong> matched</span>
    <span><strong>{report?.array?.unmatchedBlobCount || 0}</strong> unmatched</span>
    <StatusBadge value={report?.support?.largeBlobs} label={`Support: ${stateLabel(report?.support?.largeBlobs)}`} />
    {#if hasUnmatchedBlobs || gcPreview || gcResult}
      <button class="quiet compact" type="button" on:click={previewGarbageCollect} disabled={Boolean(largeBlobBusy) || $sessionBusy}>Preview cleanup</button>
      <button class="danger compact" type="button" on:click={executeGarbageCollect} disabled={Boolean(largeBlobBusy) || $sessionBusy || !canConfirmGarbageCollect}>Confirm cleanup</button>
    {/if}
  </div>
  {#if operationFailed(gcPreview)}
    <div class="notice danger">{operationFailed(gcPreview)}</div>
  {:else if gcPreview}
    <div class="notice">Cleanup preview ready. {gcPreviewData?.unmatchedBlobCount || 0} unmatched blob entries would be removed.</div>
  {/if}
  {#if operationFailed(gcResult)}
    <div class="notice danger">{operationFailed(gcResult)}</div>
  {:else if gcResult}
    <div class="notice">Cleanup complete. {gcResultData?.deletedBlobCount || 0} unmatched blob entries removed.</div>
  {/if}

  {#if credentials.length === 0}
    <EmptyState eyebrow="Loaded state" title="No resident credentials found" message="Large-blob support is loaded, but this authenticator did not report resident credentials to inspect." />
  {:else}
    <section id="large-blob-workspace" class="large-blob-workspace">
      <div class="large-blob-list-panel">
        <div class="large-blob-list-heading">
          <div>
            <h2>Blob credentials</h2>
            <p class="muted">Select a row to open its inspector.</p>
          </div>
          <span class="muted">{credentials.length} row(s)</span>
        </div>
        {#each credentials as credential}
          <article class:selected={credentialKey(credential) === selectedId} class="large-blob-row">
            <button
              class="large-blob-row-select"
              type="button"
              aria-pressed={credentialKey(credential) === selectedId}
              on:click={() => selectCredential(credential)}
            >
              <span class="large-blob-row-name">{credential.user?.displayName || credential.user?.name || credential.rp?.id || "Credential"}</span>
              <span class="large-blob-row-rp">{credential.rp?.id || "unknown RP"}</span>
              <span class="large-blob-row-state">
                <StatusBadge value={credential.blobState || "unknown"} label={credential.blobState || "unknown"} />
              </span>
              <span class="large-blob-row-bytes">{credential.blobByteCount || 0} bytes</span>
            </button>
            {#if credentialKey(credential) === selectedId}
              <div class="large-blob-inline-detail">
                <section class="large-blob-detail-panel">
                  <LargeBlobDetail
                    bind:detailMode
                    bind:payload
                    bind:decodeMode
                    readResult={activeReadResult}
                    preview={activePreview}
                    {previewMode}
                    {readDecodeMode}
                    {selectedCredential}
                    sessionBusy={$sessionBusy}
                    {largeBlobBusy}
                    {canConfirmWrite}
                    {canConfirmDelete}
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

      <aside id="large-blob-detail" class="large-blob-detail-panel">
        <LargeBlobDetail
          bind:detailMode
          bind:payload
          bind:decodeMode
          readResult={activeReadResult}
          preview={activePreview}
          {previewMode}
          {readDecodeMode}
          {selectedCredential}
          sessionBusy={$sessionBusy}
          {largeBlobBusy}
          {canConfirmWrite}
          {canConfirmDelete}
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
{/if}
