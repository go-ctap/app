<script lang="ts">
  import { get } from "svelte/store";
  import { api, operationFailed } from "$lib/api";
  import { beginOperation, clearSharedCredentialInventory, credentialGroupsFromRows, credentialsScreenCache, emptyCredentialsState, selectedSelector, selectionVersion, pushToast, sessionStatus, sharedCredentialInventoryCache, sessionBusy, setCredentialsScreenState, sharedInventoryFor, summarizeEnvelope, updateSharedCredentialInventory } from "../lib/stores";
  import { asList, reportOf } from "$lib/format";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import CopyableId from "../components/CopyableId.svelte";
  import DialogShell from "../components/DialogShell.svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import Notice from "../components/Notice.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  let loading = $state(false);
  let envelope: any = $state(null);
  let preview: any = $state(null);
  let editing: any = $state(null);
  let displayName = $state("");
  let name = $state("");
  let userIDHex = $state("");
  let cacheSelector = $state("");
  let cacheVersion = $state(-1);
  let warmReloadKey = $state("");

  let selector = $derived($selectedSelector);
  let report = $derived(reportOf(envelope));
  let groups = $derived(asList(report?.groups));

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

<ScreenHeader eyebrow="Resident credentials" title="Passkeys stored on the token" description="Browse discoverable credentials by relying party, update the friendly user fields, or delete stale entries after a backend preview.">
  {#snippet actions()}
    <Button onclick={load} disabled={!selector || loading || $sessionBusy}>{loading ? "Reloading credentials" : "Reload credentials"}</Button>
  {/snippet}
</ScreenHeader>

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator to list resident credentials." />
{:else if operationFailed(envelope)}
  <Notice variant="destructive">{operationFailed(envelope)}</Notice>
{:else if groups.length === 0}
  <EmptyState eyebrow="Ready to load" title="No credential inventory loaded" message="Reload credentials to ask the token for resident credentials. Unsupported tokens will explain their support state here." />
{:else}
  <div class="grid gap-3 md:grid-cols-3">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>Relying parties</Card.Description>
        <Card.Title>{report?.summary?.totalRPs || 0}</Card.Title>
      </Card.Header>
    </Card.Root>
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>Credentials</Card.Description>
        <Card.Title>{report?.summary?.totalCredentials || 0}</Card.Title>
      </Card.Header>
    </Card.Root>
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>Management</Card.Description>
        <StatusBadge value={report?.support?.credentialManagement} label={report?.support?.credentialManagement ? "available" : "unavailable"} />
      </Card.Header>
    </Card.Root>
  </div>

  <Card.Root id="credential-inventory">
    <Card.Header class="flex-row items-start justify-between gap-3">
      <div class="grid gap-1">
        <Card.Title>Credential inventory</Card.Title>
        <Card.Description>Grouped by relying party</Card.Description>
      </div>
      <span class="text-sm text-muted-foreground">{groups.length} relying part{groups.length === 1 ? "y" : "ies"}</span>
    </Card.Header>
    <Card.Content class="grid gap-4">
    {#each groups as group (group.rpID || group.rpName)}
      <Card.Root size="sm" class="bg-background">
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div>
            <Card.Title class="text-base">{group.rpName || group.rpID}</Card.Title>
            <Card.Description>{group.rpID}</Card.Description>
          </div>
          <span class="text-sm text-muted-foreground">{asList(group.credentials).length} credential(s)</span>
        </Card.Header>
        <Card.Content class="grid gap-2">
        {#each asList(group.credentials) as credential (credential.credentialIDHex || credential.id)}
          <article class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div class="grid min-w-0 gap-3">
              <strong class="text-sm font-medium text-foreground">{credential.displayName || credential.userName || "Unnamed user"}</strong>
              <div class="flex flex-wrap items-center gap-2">
                <CopyableId label="Credential ID" value={credential.credentialIDHex} copied={() => pushToast("Credential ID copied")} />
                <CopyableId label="User ID" value={credential.userIDHex} empty="no user id" copied={() => pushToast("User ID copied")} />
                <StatusBadge value={credential.largeBlobKeyState || "unknown"} label={`blob key ${credential.largeBlobKeyState || "unknown"}`} />
              </div>
              <details class="details-toggle">
                <summary>Raw credential details</summary>
                <JsonView value={credential} title="Credential JSON" />
              </details>
            </div>
            <div class="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onclick={() => startEdit(credential)} disabled={$sessionBusy}>Edit</Button>
              <Button size="sm" variant="destructive" onclick={() => previewDelete(credential)} disabled={$sessionBusy}>Delete</Button>
            </div>
          </article>
        {/each}
        </Card.Content>
      </Card.Root>
    {/each}
    </Card.Content>
  </Card.Root>
{/if}

{#if editing}
  <DialogShell title="Edit credential user" wide close={() => (editing = null)}>
      <Field.Group>
        <Field.Field>
          <Field.Label>User ID hex</Field.Label>
          <Input bind:value={userIDHex} />
        </Field.Field>
        <Field.Field>
          <Field.Label>Name</Field.Label>
          <Input bind:value={name} />
        </Field.Field>
        <Field.Field>
          <Field.Label>Display name</Field.Label>
          <Input bind:value={displayName} />
        </Field.Field>
      </Field.Group>
      {#if preview}
        <JsonView value={preview.result || preview} title="Update preview" />
      {/if}
      {#snippet actions()}
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onclick={previewUpdate}>Preview</Button>
        <Button onclick={executeUpdate} disabled={!preview}>Confirm update</Button>
        <Button variant="ghost" onclick={() => (editing = null)}>Close</Button>
      </div>
      {/snippet}
  </DialogShell>
{/if}

{#if preview && !editing}
  <DialogShell title="Delete credential preview" wide destructive close={() => (preview = null)}>
      <JsonView value={preview.result || preview} title="Deletion preview" />
      {#snippet actions()}
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="destructive" onclick={executeDelete}>Confirm delete</Button>
        <Button variant="ghost" onclick={() => (preview = null)}>Cancel</Button>
      </div>
      {/snippet}
  </DialogShell>
{/if}
