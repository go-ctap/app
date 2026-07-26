<script lang="ts">
  import { KeyRound } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  import PasskeyDeleteDialog from "$lib/components/passkeys/PasskeyDeleteDialog.svelte";
  import PasskeysInventory from "$lib/components/passkeys/PasskeysInventory.svelte";
  import PasskeysOverview from "$lib/components/passkeys/PasskeysOverview.svelte";
  import PasskeyUpdateDialog from "$lib/components/passkeys/PasskeyUpdateDialog.svelte";
  import InventoryScreenContent from "$lib/components/shared/InventoryScreenContent.svelte";
  import {
    beginCredentialDelete,
    beginCredentialUpdate,
    closePasskeysMutation,
    confirmCredentialDelete,
    confirmCredentialUpdate,
    editCredentialUpdate,
    previewCredentialUpdate,
    reloadPasskeys,
    selectPasskeyCredential,
    setPasskeysQuery,
    setPasskeysStatusFilter,
    setPasskeysVerificationFlow,
    updateCredentialDraft,
  } from "$lib/features/passkeys";
  import { navigateToScreen } from "$lib/features/workbench";
  import {
    authenticatorBusy,
    authenticatorStatus,
    selectedDevice,
    selectedSelector,
  } from "$lib/features/authenticator";
  import { buildPasskeysPresentation } from "$lib/passkeys-presentation";
  import {
    passkeysInventoryState,
    passkeysMutation,
    passkeysQuery,
    passkeysSelectedCredentialID,
    passkeysStatusFilter,
    passkeysVerificationFlow,
  } from "$lib/features/passkeys";

  import { m } from "../paraglide/messages.js";

  let passkeys = $derived(buildPasskeysPresentation({
    selectedSelector: $selectedSelector,
    selectedDevice: $selectedDevice,
    authenticatorBusy: $authenticatorBusy,
    authenticatorReady: $authenticatorStatus.state === "ready" && Boolean($authenticatorStatus.selectionId),
    inventoryState: $passkeysInventoryState,
    query: $passkeysQuery,
    statusFilter: $passkeysStatusFilter,
    selectedCredentialID: $passkeysSelectedCredentialID,
  }));
  async function handleReload() {
    const refreshed = await reloadPasskeys();
    if (refreshed) toast.success(m.credential_inventory_reloaded());
    return refreshed;
  }

  async function handleConfirmUpdate() {
    const succeeded = await confirmCredentialUpdate();
    if (succeeded) toast.success(m.credential_updated());
    return succeeded;
  }

  async function handleConfirmDelete() {
    const succeeded = await confirmCredentialDelete();
    if (succeeded) toast.success(m.credential_deleted());
    return succeeded;
  }

  function handleOpenLab() {
    void navigateToScreen("lab");
  }
</script>

{#if passkeys.selector}
  <section class="passkeys-screen" aria-labelledby="passkeys-title">
    <PasskeysOverview
      presentation={passkeys}
      verificationFlow={$passkeysVerificationFlow}
      onReload={handleReload}
      onVerificationFlowChange={setPasskeysVerificationFlow}
    />

    <InventoryScreenContent
      stale={passkeys.stale}
      unsupported={passkeys.unsupported}
      hasReport={passkeys.hasReport}
      loading={passkeys.loading}
      reloadDisabled={passkeys.reloadDisabled}
      staleTitle={m.passkeys_stale_title()}
      staleMessage={m.passkeys_stale_message()}
      unsupportedTitle={m.passkeys_unsupported_title()}
      unsupportedMessage={m.passkeys_unsupported_message()}
      notLoadedTitle={m.passkeys_not_loaded()}
      notLoadedMessage={m.passkeys_not_loaded_message()}
      loadLabel={m.load_credentials()}
      onReload={handleReload}
    >
      {#snippet iconContent()}<KeyRound aria-hidden="true" />{/snippet}
      {#snippet inventoryContent()}
        <PasskeysInventory
          presentation={passkeys}
          updateDisabled={passkeys.updateDisabled}
          deleteDisabled={passkeys.deleteDisabled}
          previewOnly={Boolean(passkeys.report?.support.previewOnly)}
          onQueryChange={setPasskeysQuery}
          onFilterChange={setPasskeysStatusFilter}
          onSelect={selectPasskeyCredential}
          onEdit={beginCredentialUpdate}
          onDelete={beginCredentialDelete}
          onOpenLab={handleOpenLab}
          onReload={handleReload}
        />
      {/snippet}
    </InventoryScreenContent>
  </section>

  <PasskeyUpdateDialog
    mutation={$passkeysMutation}
    onDraftChange={updateCredentialDraft}
    onEdit={editCredentialUpdate}
    onPreview={previewCredentialUpdate}
    onConfirm={handleConfirmUpdate}
    onClose={closePasskeysMutation}
  />
  <PasskeyDeleteDialog
    mutation={$passkeysMutation}
    onPreview={beginCredentialDelete}
    onConfirm={handleConfirmDelete}
    onClose={closePasskeysMutation}
  />
{/if}

<style>
@layer blocks {
  .passkeys-screen {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
  }

}

</style>
