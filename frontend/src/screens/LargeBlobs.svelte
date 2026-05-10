<script lang="ts">
  import { get } from "svelte/store";
  import { api, bytesFromText, operationFailed } from "../lib/api";
  import { beginOperation, clearSharedCredentialInventory, emptyLargeBlobState, finishOperation, largeBlobScreenCache, selectedSelector, selectionVersion, pushToast, sessionBusy, sessionStatus, setLargeBlobScreenState, setStatusOutcome, sharedCredentialInventoryCache, sharedInventoryFor, summarizeEnvelope, updateSharedCredentialInventory } from "../lib/stores";
  import { asList, reportOf, stateLabel } from "../lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import EmptyState from "../components/EmptyState.svelte";
  import LargeBlobDetail from "../components/LargeBlobDetail.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

  let loading = $state(false);
  let largeBlobBusy: "" | "list" | "read" | "preview-write" | "write" | "preview-delete" | "delete" | "preview-gc" | "gc" = $state("");
  let envelope: any = $state(null);
  let readResult: any = $state(null);
  let readCredentialId = $state("");
  let selectedId = $state("");
  let payload = $state("");
  let payloadByCredential: Record<string, string> = $state({});
  let decodeMode = $state("utf8");
  let readDecodeMode = $state("");
  let preview: any = $state(null);
  let previewBinding: any = $state(null);
  let previewMode: "write" | "delete" | "" = $state("");
  let gcPreview: any = $state(null);
  let gcResult: any = $state(null);
  let gcPreviewBinding: any = $state(null);
  let detailMode: "read" | "write" | "delete" | "raw" = $state("read");
  let cacheSelector = $state("");
  let cacheVersion = $state(-1);
  let operationEpoch = $state(0);
  let listVersion = $state(0);
  let warmReloadKey = $state("");

  let selector = $derived($selectedSelector);
  let report = $derived(reportOf(envelope));
  let credentials = $derived(asList(report?.credentials));
  let largeBlobLoaded = $derived(Boolean(envelope && !operationFailed(envelope)));
  let selectedCredential = $derived(credentials.find((credential: any) => credentialKey(credential) === selectedId) || null);
  let activeReadResult = $derived(readCredentialId === selectedId ? readResult : null);
  let activePreview = $derived(previewMatchesCurrent() ? preview : null);
  let canConfirmWrite = $derived(previewMode === "write" && Boolean(activePreview) && !operationFailed(activePreview) && previewMatches("write"));
  let canConfirmDelete = $derived(previewMode === "delete" && Boolean(activePreview) && !operationFailed(activePreview) && previewMatches("delete"));
  let canConfirmGarbageCollect = $derived(Boolean(gcPreview) && !operationFailed(gcPreview) && gcPreviewBinding?.selector === selector && gcPreviewBinding?.listVersion === listVersion);
  let hasUnmatchedBlobs = $derived((report?.array?.unmatchedBlobCount || 0) > 0);
  let gcPreviewOutput = $derived(reportOf(gcPreview));
  let gcPreviewData = $derived(gcPreviewOutput?.preview || gcPreviewOutput);
  let gcResultOutput = $derived(reportOf(gcResult));
  let gcResultData = $derived(gcResultOutput?.result || gcResultOutput);

  $effect(() => {
    if (selector !== cacheSelector) restoreState(selector);
  });

  $effect(() => {
    if ($selectionVersion !== cacheVersion) restoreState(selector);
  });

  $effect(() => {
    if (selector && $sharedCredentialInventoryCache && !loading) hydrateFromSharedInventory(selector);
  });

  $effect(() => {
    if (selector && selector === cacheSelector) persistState();
  });

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || m.operation_failed());
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
          support: { largeBlobs: m.cached_credentials() },
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
      if (!options.quiet) beginOperation(options.warm ? m.large_blob_warm_reload() : m.large_blob_list(), "large-blob-workspace");
      const result = await api.listLargeBlobs(selector);
      if (token !== operationEpoch) return;
      if (!options.preserveOnError || !operationFailed(result)) {
        envelope = result;
        if (!operationFailed(result)) {
          markListLoaded();
          updateSharedCredentialInventory(selector, result, "largeBlobs");
        }
      }
      if (!options.quiet) summarizeEnvelope(options.warm ? m.large_blob_warm_reload() : m.large_blob_list(), result, "large-blob-workspace", () => load());
      return result;
    } catch (error) {
      if (token !== operationEpoch) return;
      const failure = failureEnvelope(error);
      if (!options.preserveOnError) {
        envelope = failure;
      }
      if (!options.quiet) summarizeEnvelope(options.warm ? m.large_blob_warm_reload() : m.large_blob_list(), failure, "large-blob-workspace", () => load());
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
      beginOperation(m.large_blob_read(), "large-blob-detail");
      const result = await api.readLargeBlob({ selector, credentialIdHex: credentialId, decodeMode });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      readResult = result;
      readCredentialId = credentialId;
      readDecodeMode = decodeMode;
      summarizeEnvelope(m.large_blob_read(), readResult, "large-blob-detail", () => readBlob(credential));
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      readResult = failureEnvelope(error);
      readCredentialId = credentialId;
      summarizeEnvelope(m.large_blob_read(), readResult, "large-blob-detail", () => readBlob(credential));
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
      beginOperation(m.write_preview(), "large-blob-detail");
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
        summarizeEnvelope(m.write_preview(), preview, "large-blob-detail", previewWrite);
      } else {
        finishOperation();
        setStatusOutcome({ tone: "info", title: m.write_preview_ready_title(), message: m.byte_payload_prepared({ count: capturedPayloadBytes.length }), detailId: "large-blob-detail" });
      }
    } catch (error) {
      if (token !== operationEpoch || credentialKey(selectedCredential) !== credentialId) return;
      preview = failureEnvelope(error);
      bindPreview("write", credentialId, capturedPayloadHash, capturedDecodeMode);
      summarizeEnvelope(m.write_preview(), preview, "large-blob-detail", previewWrite);
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
      beginOperation(m.large_blob_write(), "large-blob-detail");
      result = await api.writeLargeBlob({
        selector,
        credentialIdHex: credentialId,
        payload: bytesFromText(payload),
        confirmed: true,
        confirmationMessage: m.large_blob_write(),
      });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = null;
      previewBinding = null;
      previewMode = "";
      clearGarbageCollectState();
      clearSharedCredentialInventory(selector);
      endAction("write");
      await load({ clearCleanup: false });
      pushToast(m.large_blob_written());
      summarizeEnvelope(m.large_blob_write(), result, "large-blob-detail");
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      result = failureEnvelope(error);
      summarizeEnvelope(m.large_blob_write(), result, "large-blob-detail", executeWrite);
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
      beginOperation(m.delete_preview(), "large-blob-detail");
      const result = await api.deleteLargeBlob({ selector, credentialIdHex: credentialId, dryRun: true });
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = result;
      bindPreview("delete", credentialId);
      if (operationFailed(preview)) {
        summarizeEnvelope(m.delete_preview(), preview, "large-blob-detail", () => previewDelete(credential));
      } else {
        finishOperation();
        setStatusOutcome({ tone: "warning", title: m.delete_preview_ready_title(), message: m.review_mutation_before_delete(), detailId: "large-blob-detail" });
      }
    } catch (error) {
      if (token !== operationEpoch || selectedId !== credentialId) return;
      preview = failureEnvelope(error);
      bindPreview("delete", credentialId);
      summarizeEnvelope(m.delete_preview(), preview, "large-blob-detail", () => previewDelete(credential));
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
      beginOperation(m.large_blob_delete(), "large-blob-detail");
      result = await api.deleteLargeBlob({
        selector,
        credentialIdHex: credentialId,
        confirmed: true,
        confirmationMessage: m.large_blob_delete(),
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
          pushToast(m.large_blob_deleted());
          finishOperation();
          setStatusOutcome({
            tone: "warning",
            title: m.large_blob_delete_applied(),
            message: m.blob_gone_ctap_issue(),
            detailId: "large-blob-detail",
          });
        } else {
          summarizeEnvelope(m.large_blob_delete(), result, "large-blob-detail", executeDelete);
        }
      } else {
        pushToast(m.large_blob_deleted());
        summarizeEnvelope(m.large_blob_delete(), result, "large-blob-detail");
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
        pushToast(m.large_blob_deleted());
        finishOperation();
        setStatusOutcome({
          tone: "warning",
          title: m.large_blob_delete_applied(),
          message: m.blob_gone_ctap_issue(),
          detailId: "large-blob-detail",
        });
      } else {
        summarizeEnvelope(m.large_blob_delete(), result, "large-blob-detail", executeDelete);
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
      beginOperation(m.large_blob_cleanup_preview(), "large-blob-workspace");
      const result = await api.garbageCollectLargeBlobs({ selector: previewSelector, dryRun: true });
      if (token !== operationEpoch || selector !== previewSelector || listVersion !== previewListVersion) return;
      gcPreview = result;
      gcPreviewBinding = { selector: previewSelector, listVersion: previewListVersion };
      gcResult = null;
      summarizeEnvelope(m.large_blob_cleanup_preview(), gcPreview, "large-blob-workspace", previewGarbageCollect);
    } catch (error) {
      if (token !== operationEpoch || selector !== previewSelector || listVersion !== previewListVersion) return;
      gcPreview = failureEnvelope(error);
      gcPreviewBinding = { selector: previewSelector, listVersion: previewListVersion };
      summarizeEnvelope(m.large_blob_cleanup_preview(), gcPreview, "large-blob-workspace", previewGarbageCollect);
    } finally {
      endAction("preview-gc");
    }
  }

  async function executeGarbageCollect() {
    if (!selector || !canConfirmGarbageCollect || !beginAction("gc")) return;
    const token = ++operationEpoch;
    try {
      beginOperation(m.large_blob_cleanup(), "large-blob-workspace");
      const result = await api.garbageCollectLargeBlobs({
        selector,
        confirmed: true,
        confirmationMessage: m.large_blob_cleanup(),
      });
      if (token !== operationEpoch) return;
      gcPreview = null;
      gcPreviewBinding = null;
      clearSharedCredentialInventory(selector);
      endAction("gc");
      await load({ clearCleanup: false });
      gcResult = result;
      pushToast(m.large_blob_cleanup_complete());
      summarizeEnvelope(m.large_blob_cleanup(), gcResult, "large-blob-workspace");
    } catch (error) {
      if (token !== operationEpoch) return;
      gcResult = failureEnvelope(error);
      summarizeEnvelope(m.large_blob_cleanup(), gcResult, "large-blob-workspace", executeGarbageCollect);
    } finally {
      endAction("gc");
    }
  }

  function copyToast(message: string) {
    pushToast(message);
  }
</script>

<ScreenHeader eyebrow={m.nav_large_blobs()} title={m.credential_blob_workspace()} description={m.large_blobs_description()}>
  {#snippet actions()}
    <Button onclick={() => load()} disabled={!selector || Boolean(largeBlobBusy) || $sessionBusy}>{loading ? m.reloading_blobs() : m.reload_blobs()}</Button>
  {/snippet}
</ScreenHeader>

{#if !selector}
  <EmptyState eyebrow={m.no_token()} title={m.no_token_selected()} message={m.select_authenticator_for_large_blobs()} />
{:else if operationFailed(envelope)}
  <Alert variant="destructive"><AlertDescription>{operationFailed(envelope)}</AlertDescription></Alert>
{:else if !largeBlobLoaded}
  <EmptyState eyebrow={m.workspace_ready()} variant="workspace" title={m.no_large_blob_state_loaded()} message={m.no_large_blob_state_message()} />
{:else}
  <Card.Root aria-label={m.large_blob_summary()}>
    <Card.Content class="flex flex-wrap items-center gap-2 pt-6">
    <Badge variant="secondary">{m.blobs_count({ count: report?.array?.blobCount || 0 })}</Badge>
    <Badge variant="outline">{m.matched_count({ count: report?.array?.matchedBlobCount || 0 })}</Badge>
    <Badge variant={hasUnmatchedBlobs ? "destructive" : "outline"}>{m.unmatched_count({ count: report?.array?.unmatchedBlobCount || 0 })}</Badge>
    <StatusBadge value={report?.support?.largeBlobs} label={`Support: ${stateLabel(report?.support?.largeBlobs)}`} />
    {#if hasUnmatchedBlobs || gcPreview || gcResult}
      <Button size="sm" variant="outline" onclick={previewGarbageCollect} disabled={Boolean(largeBlobBusy) || $sessionBusy}>{m.preview_cleanup()}</Button>
      <Button size="sm" variant="destructive" onclick={executeGarbageCollect} disabled={Boolean(largeBlobBusy) || $sessionBusy || !canConfirmGarbageCollect}>{m.confirm_cleanup()}</Button>
    {/if}
    </Card.Content>
  </Card.Root>
  {#if operationFailed(gcPreview)}
    <Alert variant="destructive"><AlertDescription>{operationFailed(gcPreview)}</AlertDescription></Alert>
  {:else if gcPreview}
    <Alert><AlertDescription>Cleanup preview ready. {gcPreviewData?.unmatchedBlobCount || 0} unmatched blob entries would be removed.</AlertDescription></Alert>
  {/if}
  {#if operationFailed(gcResult)}
    <Alert variant="destructive"><AlertDescription>{operationFailed(gcResult)}</AlertDescription></Alert>
  {:else if gcResult}
    <Alert><AlertDescription>Cleanup complete. {gcResultData?.deletedBlobCount || 0} unmatched blob entries removed.</AlertDescription></Alert>
  {/if}

  {#if credentials.length === 0}
    <EmptyState eyebrow={m.loaded_state()} title={m.no_resident_credentials_found()} message={m.no_resident_credentials_large_blob_message()} />
  {:else}
    <section id="large-blob-workspace" class="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.3fr)]">
      <Card.Root>
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div class="grid gap-1">
            <Card.Title>{m.blob_credentials()}</Card.Title>
            <Card.Description>{m.select_row_to_open_inspector()}</Card.Description>
          </div>
          <span class="text-sm text-muted-foreground">{m.rows_count({ count: credentials.length })}</span>
        </Card.Header>
        <Card.Content class="grid max-h-[66vh] gap-2 overflow-auto pr-1">
        {#each credentials as credential (credentialKey(credential))}
          <article class="rounded-md border border-border bg-background p-2">
            <Button
              variant={credentialKey(credential) === selectedId ? "secondary" : "ghost"}
              class="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
              aria-pressed={credentialKey(credential) === selectedId}
              onclick={() => selectCredential(credential)}
            >
              <span class="grid w-full min-w-0 gap-1">
                <span class="truncate text-sm font-medium">{credential.user?.displayName || credential.user?.name || credential.rp?.id || m.credential()}</span>
                <span class="truncate text-xs font-normal text-muted-foreground">{credential.rp?.id || m.unknown_rp()}</span>
                <span class="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge value={credential.blobState || "unknown"} label={credential.blobState || m.state_unknown()} />
                  <Badge variant="outline">{m.bytes_count({ count: credential.blobByteCount || 0 })}</Badge>
                </span>
              </span>
            </Button>
            {#if credentialKey(credential) === selectedId}
              <div class="mt-3 xl:hidden">
                <Card.Root size="sm">
                  <Card.Content class="pt-4">
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
                  </Card.Content>
                </Card.Root>
              </div>
              {/if}
          </article>
        {/each}
        </Card.Content>
      </Card.Root>

      <Card.Root id="large-blob-detail" class="hidden xl:flex">
        <Card.Content class="pt-6">
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
        </Card.Content>
      </Card.Root>
    </section>
  {/if}
{/if}
