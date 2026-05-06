<script lang="ts">
  import { api, operationFailed } from "../lib/api";
  import { selectedSelector, pushToast } from "../lib/stores";
  import { asList, reportOf } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";

  let loading = false;
  let envelope: any = null;
  let preview: any = null;
  let editing: any = null;
  let displayName = "";
  let name = "";
  let userIDHex = "";

  $: selector = $selectedSelector;
  $: report = reportOf(envelope);
  $: groups = asList(report?.groups);

  async function load() {
    if (!selector) return;
    loading = true;
    envelope = await api.listCredentials(selector);
    loading = false;
  }

  async function previewDelete(credential: any) {
    preview = await api.deleteCredential({ selector, credentialIdHex: credential.credentialIDHex, dryRun: true });
  }

  async function executeDelete() {
    const credentialIdHex = preview?.result?.preview?.target?.credentialIDHex || preview?.result?.preview?.credentialIDHex;
    await api.deleteCredential({ selector, credentialIdHex, confirmed: true, confirmationMessage: "delete credential" });
    preview = null;
    await load();
    pushToast("Credential deleted");
  }

  function startEdit(credential: any) {
    editing = credential;
    displayName = credential.displayName || "";
    name = credential.userName || "";
    userIDHex = credential.userIDHex || "";
    preview = null;
  }

  async function previewUpdate() {
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
  }

  async function executeUpdate() {
    await api.updateCredentialUser({
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
    editing = null;
    preview = null;
    await load();
    pushToast("Credential updated");
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Resident credentials</p>
    <h1>Passkeys stored on the token</h1>
    <p class="lede">Browse discoverable credentials by relying party, update the friendly user fields, or delete stale entries after a backend preview.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector || loading}>{loading ? "Loading" : "Refresh"}</button>
</section>

{#if !selector}
  <EmptyState title="No token selected" message="Select an authenticator to list resident credentials." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if groups.length === 0}
  <EmptyState title="No credential inventory loaded" message="Refresh to ask the token for resident credentials. Unsupported tokens will explain their support state here." />
{:else}
  <div class="summary-line">
    <span>{report?.summary?.totalRPs || 0} relying parties</span>
    <span>{report?.summary?.totalCredentials || 0} credentials</span>
    <span>Management: {report?.support?.credentialManagement ? "available" : "unavailable"}</span>
  </div>

  {#each groups as group}
    <section class="list-section">
      <h2>{group.rpName || group.rpID}</h2>
      <p class="muted">{group.rpID}</p>
      <div class="table">
        {#each asList(group.credentials) as credential}
          <article class="row">
            <div>
              <strong>{credential.displayName || credential.userName || "Unnamed user"}</strong>
              <code>{credential.credentialIDHex}</code>
              <p>{credential.userIDHex || "no user id"} · blob key {credential.largeBlobKeyState || "unknown"}</p>
            </div>
            <div class="actions">
              <button type="button" on:click={() => startEdit(credential)}>Edit</button>
              <button class="danger" type="button" on:click={() => previewDelete(credential)}>Delete</button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/each}
{/if}

{#if editing}
  <div class="modal-backdrop">
    <div class="modal wide">
      <h2>Edit credential user</h2>
      <label>User ID hex <input bind:value={userIDHex} /></label>
      <label>Name <input bind:value={name} /></label>
      <label>Display name <input bind:value={displayName} /></label>
      {#if preview}
        <JsonView value={preview.result || preview} title="Update preview" />
      {/if}
      <div class="actions">
        <button type="button" on:click={previewUpdate}>Preview</button>
        <button type="button" on:click={executeUpdate} disabled={!preview}>Confirm update</button>
        <button class="quiet" type="button" on:click={() => (editing = null)}>Close</button>
      </div>
    </div>
  </div>
{/if}

{#if preview && !editing}
  <div class="modal-backdrop">
    <div class="modal wide">
      <h2>Delete credential preview</h2>
      <JsonView value={preview.result || preview} title="Deletion preview" />
      <div class="actions">
        <button class="danger" type="button" on:click={executeDelete}>Confirm delete</button>
        <button class="quiet" type="button" on:click={() => (preview = null)}>Cancel</button>
      </div>
    </div>
  </div>
{/if}
