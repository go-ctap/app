<script lang="ts">
  import { get } from "svelte/store";
  import { api, operationFailed } from "../lib/api";
  import { beginOperation, clearSharedCredentialInventory, credentialGroupsFromRows, credentialsScreenCache, emptyCredentialsState, selectedSelector, selectionVersion, pushToast, sessionStatus, sharedCredentialInventoryCache, sessionBusy, setCredentialsScreenState, sharedInventoryFor, summarizeEnvelope, updateSharedCredentialInventory } from "../lib/stores";
  import { asList, reportOf } from "../lib/format";
  import CopyableId from "../components/CopyableId.svelte";
  import DialogShell from "../components/DialogShell.svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let loading = false;
  let envelope: any = null;
  let preview: any = null;
  let editing: any = null;
  let displayName = "";
  let name = "";
  let userIDHex = "";
  let cacheSelector = "";
  let cacheVersion = -1;
  let warmReloadKey = "";

  $: selector = $selectedSelector;
  $: if (selector !== cacheSelector) restoreState(selector);
  $: if ($selectionVersion !== cacheVersion) restoreState(selector);
  $: if (selector && $sharedCredentialInventoryCache && !loading) hydrateFromSharedInventory(selector);
  $: if (selector && selector === cacheSelector) persistState();
  $: report = reportOf(envelope);
  $: groups = asList(report?.groups);

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  function restoreState(nextSelector: string) {
    const cached = get(credentialsScreenCache)[nextSelector] || emptyCredentialsState();
    envelope = cached.envelope;
    preview = cached.preview;
    editing = cached.editing;
    displayName = cached.displayName;
    name = cached.name;
    userIDHex = cached.userIDHex;
    cacheSelector = nextSelector;
    cacheVersion = $selectionVersion;
    hydrateFromSharedInventory(nextSelector);
  }

  function persistState() {
    setCredentialsScreenState(selector, { envelope, preview, editing, displayName, name, userIDHex });
  }

  function blobInventoryEnvelope(inventory: any) {
    const groups = credentialGroupsFromRows(inventory?.blobCredentials || []);
    return {
      result: {
        report: {
          groups,
          summary: {
            totalRPs: groups.length,
            totalCredentials: groups.reduce((total: number, group: any) => total + (group.credentials?.length || 0), 0),
          },
          support: { credentialManagement: "cached from blob map" },
        },
      },
    };
  }

  function hydrateFromSharedInventory(nextSelector: string) {
    if (!nextSelector || nextSelector !== cacheSelector || envelope) return;
    const inventory = sharedInventoryFor(nextSelector);
    if (!inventory) return;
    if (inventory.hasManagementFields && inventory.managementEnvelope) {
      envelope = inventory.managementEnvelope;
      return;
    }
    if (inventory.hasBlobFields && inventory.blobCredentials.length > 0) {
      envelope = blobInventoryEnvelope(inventory);
      if ($sessionStatus.state === "ready" && warmReloadKey !== `${nextSelector}:${inventory.loadedAt}`) {
        warmReloadKey = `${nextSelector}:${inventory.loadedAt}`;
        void load({ warm: true });
      }
    }
  }

  async function load(options: { warm?: boolean } = {}) {
    if (!selector) return;
    loading = true;
    try {
      beginOperation(options.warm ? "Credential warm reload" : "Credential list", "credential-inventory");
      envelope = await api.listCredentials(selector);
      if (!operationFailed(envelope)) {
        updateSharedCredentialInventory(selector, envelope, "credentials");
      }
      summarizeEnvelope(options.warm ? "Credential warm reload" : "Credential list", envelope, "credential-inventory", load);
    } catch (error) {
      envelope = failureEnvelope(error);
      summarizeEnvelope(options.warm ? "Credential warm reload" : "Credential list", envelope, "credential-inventory", load);
    } finally {
      loading = false;
    }
  }

  async function previewDelete(credential: any) {
    try {
      beginOperation("Credential delete preview", "credential-inventory");
      preview = await api.deleteCredential({ selector, credentialIdHex: credential.credentialIDHex, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope("Credential delete preview", preview, "credential-inventory", () => previewDelete(credential));
  }

  async function executeDelete() {
    const credentialIdHex = preview?.result?.preview?.target?.credentialIDHex || preview?.result?.preview?.credentialIDHex;
    let result: any = null;
    try {
      beginOperation("Credential delete", "credential-inventory");
      result = await api.deleteCredential({ selector, credentialIdHex, confirmed: true, confirmationMessage: "delete credential" });
    } catch (error) {
      result = failureEnvelope(error);
    }
    preview = null;
    if (!operationFailed(result)) {
      clearSharedCredentialInventory(selector);
      await load();
      editing = null;
    }
    summarizeEnvelope("Credential delete", result, "credential-inventory");
    if (!operationFailed(result)) {
      pushToast("Credential deleted");
    }
  }

  function startEdit(credential: any) {
    editing = credential;
    displayName = credential.displayName || "";
    name = credential.userName || "";
    userIDHex = credential.userIDHex || "";
    preview = null;
  }

  async function previewUpdate() {
    try {
      beginOperation("Credential update preview", "credential-inventory");
      preview = await api.updateCredentialUser({
        selector,
        credentialIdHex: editing.credentialIDHex,
        userIdHex: userIDHex,
        name,
        displayName,
        userIdProvided: userIDHex.length > 0,
        nameProvided: true,
        displayProvided: true,
        dryRun: true,
      });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope("Credential update preview", preview, "credential-inventory", previewUpdate);
  }

  async function executeUpdate() {
    let result: any = null;
    try {
      beginOperation("Credential update", "credential-inventory");
      result = await api.updateCredentialUser({
        selector,
        credentialIdHex: editing.credentialIDHex,
        userIdHex: userIDHex,
        name,
        displayName,
        userIdProvided: userIDHex.length > 0,
        nameProvided: true,
        displayProvided: true,
        confirmed: true,
        confirmationMessage: "update credential user",
      });
    } catch (error) {
      result = failureEnvelope(error);
    }
    if (!operationFailed(result)) {
      editing = null;
      preview = null;
      clearSharedCredentialInventory(selector);
      await load();
    }
    summarizeEnvelope("Credential update", result, "credential-inventory");
    if (!operationFailed(result)) {
      pushToast("Credential updated");
    }
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Resident credentials</p>
    <h1>Passkeys stored on the token</h1>
    <p class="lede">Browse discoverable credentials by relying party, update the friendly user fields, or delete stale entries after a backend preview.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector || loading || $sessionBusy}>{loading ? "Reloading credentials" : "Reload credentials"}</button>
</section>

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator to list resident credentials." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if groups.length === 0}
  <EmptyState eyebrow="Ready to load" title="No credential inventory loaded" message="Reload credentials to ask the token for resident credentials. Unsupported tokens will explain their support state here." />
{:else}
  <div class="summary-line">
    <span>{report?.summary?.totalRPs || 0} relying parties</span>
    <span>{report?.summary?.totalCredentials || 0} credentials</span>
    <StatusBadge value={report?.support?.credentialManagement} label={`Management: ${report?.support?.credentialManagement ? "available" : "unavailable"}`} />
  </div>

  <section id="credential-inventory" class="list-section workbench-list">
    <div class="section-heading list-heading">
      <div>
        <h2>Credential inventory</h2>
        <p class="muted">Grouped by relying party</p>
      </div>
      <span class="muted">{groups.length} relying part{groups.length === 1 ? "y" : "ies"}</span>
    </div>
    {#each groups as group}
      <section class="rp-group">
        <div class="group-heading">
          <div>
            <h3>{group.rpName || group.rpID}</h3>
            <p class="muted">{group.rpID}</p>
          </div>
          <span>{asList(group.credentials).length} credential(s)</span>
        </div>
        {#each asList(group.credentials) as credential}
          <article class="row inventory-row">
            <div class="row-main">
              <strong>{credential.displayName || credential.userName || "Unnamed user"}</strong>
              <div class="row-meta">
                <CopyableId label="Credential ID" value={credential.credentialIDHex} on:copied={() => pushToast("Credential ID copied")} />
                <CopyableId label="User ID" value={credential.userIDHex} empty="no user id" on:copied={() => pushToast("User ID copied")} />
                <StatusBadge value={credential.largeBlobKeyState || "unknown"} label={`blob key ${credential.largeBlobKeyState || "unknown"}`} />
              </div>
              <details class="details-toggle">
                <summary>Raw credential details</summary>
                <JsonView value={credential} title="Credential JSON" />
              </details>
            </div>
            <div class="actions">
              <button class="compact" type="button" on:click={() => startEdit(credential)} disabled={$sessionBusy}>Edit</button>
              <button class="compact danger" type="button" on:click={() => previewDelete(credential)} disabled={$sessionBusy}>Delete</button>
            </div>
          </article>
        {/each}
      </section>
    {/each}
  </section>
{/if}

{#if editing}
  <DialogShell title="Edit credential user" wide on:close={() => (editing = null)}>
      <label>User ID hex <input bind:value={userIDHex} /></label>
      <label>Name <input bind:value={name} /></label>
      <label>Display name <input bind:value={displayName} /></label>
      {#if preview}
        <JsonView value={preview.result || preview} title="Update preview" />
      {/if}
      <div class="actions" slot="actions">
        <button type="button" on:click={previewUpdate}>Preview</button>
        <button data-primary type="button" on:click={executeUpdate} disabled={!preview}>Confirm update</button>
        <button class="quiet" type="button" on:click={() => (editing = null)}>Close</button>
      </div>
  </DialogShell>
{/if}

{#if preview && !editing}
  <DialogShell title="Delete credential preview" wide destructive on:close={() => (preview = null)}>
      <JsonView value={preview.result || preview} title="Deletion preview" />
      <div class="actions" slot="actions">
        <button data-primary class="danger" type="button" on:click={executeDelete}>Confirm delete</button>
        <button class="quiet" type="button" on:click={() => (preview = null)}>Cancel</button>
      </div>
  </DialogShell>
{/if}
