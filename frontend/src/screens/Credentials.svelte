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
  import { m } from "../paraglide/messages.js";

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
    const message = error instanceof Error ? error.message : String(error || m.operation_failed());
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
          support: { credentialManagement: m.cached_from_blob_map() },
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
      beginOperation(options.warm ? m.credential_warm_reload() : m.credential_list(), "credential-inventory");
      envelope = await api.listCredentials(selector);
      if (!operationFailed(envelope)) {
        updateSharedCredentialInventory(selector, envelope, "credentials");
      }
      summarizeEnvelope(options.warm ? m.credential_warm_reload() : m.credential_list(), envelope, "credential-inventory", load);
    } catch (error) {
      envelope = failureEnvelope(error);
      summarizeEnvelope(options.warm ? m.credential_warm_reload() : m.credential_list(), envelope, "credential-inventory", load);
    } finally {
      loading = false;
    }
  }

  async function previewDelete(credential: any) {
    try {
      beginOperation(m.credential_delete_preview(), "credential-inventory");
      preview = await api.deleteCredential({ selector, credentialIdHex: credential.credentialIDHex, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope(m.credential_delete_preview(), preview, "credential-inventory", () => previewDelete(credential));
  }

  async function executeDelete() {
    const credentialIdHex = preview?.result?.preview?.target?.credentialIDHex || preview?.result?.preview?.credentialIDHex;
    let result: any = null;
    try {
      beginOperation(m.credential_delete(), "credential-inventory");
      result = await api.deleteCredential({ selector, credentialIdHex, confirmed: true, confirmationMessage: m.credential_delete() });
    } catch (error) {
      result = failureEnvelope(error);
    }
    preview = null;
    if (!operationFailed(result)) {
      clearSharedCredentialInventory(selector);
      await load();
      editing = null;
    }
    summarizeEnvelope(m.credential_delete(), result, "credential-inventory");
    if (!operationFailed(result)) {
      pushToast(m.credential_deleted());
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
      beginOperation(m.credential_update_preview(), "credential-inventory");
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
    summarizeEnvelope(m.credential_update_preview(), preview, "credential-inventory", previewUpdate);
  }

  async function executeUpdate() {
    let result: any = null;
    try {
      beginOperation(m.credential_update(), "credential-inventory");
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
        confirmationMessage: m.credential_update(),
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
    summarizeEnvelope(m.credential_update(), result, "credential-inventory");
    if (!operationFailed(result)) {
      pushToast(m.credential_updated());
    }
  }
</script>

<ScreenHeader eyebrow={m.resident_credentials()} title={m.passkeys_stored_on_token()} description={m.credentials_description()}>
  {#snippet actions()}
    <Button onclick={load} disabled={!selector || loading || $sessionBusy}>{loading ? m.reloading_credentials() : m.reload_credentials()}</Button>
  {/snippet}
</ScreenHeader>

{#if !selector}
  <EmptyState eyebrow={m.no_token()} title={m.no_token_selected()} message={m.select_authenticator_for_credentials()} />
{:else if operationFailed(envelope)}
  <Notice variant="destructive">{operationFailed(envelope)}</Notice>
{:else if groups.length === 0}
  <EmptyState eyebrow={m.ready_to_load()} title={m.no_credential_inventory_loaded()} message={m.no_credential_inventory_message()} />
{:else}
  <div class="grid gap-3 md:grid-cols-3">
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>{m.relying_parties()}</Card.Description>
        <Card.Title>{report?.summary?.totalRPs || 0}</Card.Title>
      </Card.Header>
    </Card.Root>
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>{m.credentials()}</Card.Description>
        <Card.Title>{report?.summary?.totalCredentials || 0}</Card.Title>
      </Card.Header>
    </Card.Root>
    <Card.Root size="sm">
      <Card.Header>
        <Card.Description>{m.management()}</Card.Description>
        <StatusBadge value={report?.support?.credentialManagement} label={report?.support?.credentialManagement ? m.state_available() : m.unavailable()} />
      </Card.Header>
    </Card.Root>
  </div>

  <Card.Root id="credential-inventory">
    <Card.Header class="flex-row items-start justify-between gap-3">
      <div class="grid gap-1">
        <Card.Title>{m.credential_inventory()}</Card.Title>
        <Card.Description>{m.grouped_by_relying_party()}</Card.Description>
      </div>
      <span class="text-sm text-muted-foreground">{m.relying_parties_count({ count: groups.length })}</span>
    </Card.Header>
    <Card.Content class="grid gap-4">
    {#each groups as group (group.rpID || group.rpName)}
      <Card.Root size="sm" class="bg-background">
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div>
            <Card.Title class="text-base">{group.rpName || group.rpID}</Card.Title>
            <Card.Description>{group.rpID}</Card.Description>
          </div>
          <span class="text-sm text-muted-foreground">{m.credentials_count({ count: asList(group.credentials).length })}</span>
        </Card.Header>
        <Card.Content class="grid gap-2">
        {#each asList(group.credentials) as credential (credential.credentialIDHex || credential.id)}
          <article class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div class="grid min-w-0 gap-3">
              <strong class="text-sm font-medium text-foreground">{credential.displayName || credential.userName || m.unnamed_user()}</strong>
              <div class="flex flex-wrap items-center gap-2">
                <CopyableId label={m.credential_id()} value={credential.credentialIDHex} copied={() => pushToast(m.credential_id_copied())} />
                <CopyableId label={m.user_id()} value={credential.userIDHex} empty={m.no_user_id()} copied={() => pushToast(m.user_id_copied())} />
                <StatusBadge value={credential.largeBlobKeyState || "unknown"} label={m.blob_key_status({ status: credential.largeBlobKeyState || m.state_unknown() })} />
              </div>
              <details class="rounded-md border bg-card p-3">
                <summary>{m.raw_credential_details()}</summary>
                <JsonView value={credential} title={m.credential_json()} />
              </details>
            </div>
            <div class="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onclick={() => startEdit(credential)} disabled={$sessionBusy}>{m.edit()}</Button>
              <Button size="sm" variant="destructive" onclick={() => previewDelete(credential)} disabled={$sessionBusy}>{m.delete()}</Button>
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
  <DialogShell title={m.edit_credential_user()} wide close={() => (editing = null)}>
      <Field.Group>
        <Field.Field>
          <Field.Label>{m.user_id_hex()}</Field.Label>
          <Input bind:value={userIDHex} />
        </Field.Field>
        <Field.Field>
          <Field.Label>{m.name()}</Field.Label>
          <Input bind:value={name} />
        </Field.Field>
        <Field.Field>
          <Field.Label>{m.display_name()}</Field.Label>
          <Input bind:value={displayName} />
        </Field.Field>
      </Field.Group>
      {#if preview}
        <JsonView value={preview.result || preview} title={m.update_preview()} />
      {/if}
      {#snippet actions()}
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onclick={previewUpdate}>{m.preview()}</Button>
        <Button onclick={executeUpdate} disabled={!preview}>{m.confirm_update()}</Button>
        <Button variant="ghost" onclick={() => (editing = null)}>{m.close()}</Button>
      </div>
      {/snippet}
  </DialogShell>
{/if}

{#if preview && !editing}
  <DialogShell title={m.delete_credential_preview()} wide destructive close={() => (preview = null)}>
      <JsonView value={preview.result || preview} title={m.deletion_preview()} />
      {#snippet actions()}
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="destructive" onclick={executeDelete}>{m.confirm_delete()}</Button>
        <Button variant="ghost" onclick={() => (preview = null)}>{m.cancel()}</Button>
      </div>
      {/snippet}
  </DialogShell>
{/if}
