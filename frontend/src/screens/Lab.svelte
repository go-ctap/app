<script lang="ts">
  import { tick } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";

  import GetAssertionStep from "$lib/components/lab/GetAssertionStep.svelte";
  import LabHeader from "$lib/components/lab/LabHeader.svelte";
  import MakeCredentialStep from "$lib/components/lab/MakeCredentialStep.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import {
    cancelLabHandoff,
    cancelLabPreset,
    confirmLabHandoff,
    confirmLabMakeCredential,
    confirmLabPreset,
    editLabGetAssertion,
    editLabMakeCredential,
    handoffLabCredential,
    newLabGetAssertionRun,
    newLabMakeCredentialRun,
    previewLabMakeCredential,
    regenerateLabGetChallenge,
    regenerateLabMakeChallenge,
    regenerateLabUserID,
    requestLabPreset,
    rerunLabGetAssertion,
    runLabGetAssertion,
    updateLabGetAssertionDraft,
    updateLabMakeCredentialDraft,
  } from "$lib/controller";
  import {
    labState,
    selectedDevice,
    selectedSelector,
    sessionBusy,
    type LabPresetID,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let scenarioDirty = $derived(
    $labState.isCustom
      || $labState.makeStep.phase !== "editing"
      || $labState.getStep.phase !== "editing"
      || $labState.pendingHandoff !== null,
  );
  let presetDialogOpen = $derived(Boolean($labState.pendingPresetID));
  let handoffDialogOpen = $derived(Boolean($labState.pendingHandoff));
  let controlsDisabled = $derived($sessionBusy);

  async function focusGetAssertion() {
    await tick();
    const heading = document.getElementById("lab-get-assertion-heading");
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
    heading?.focus({ preventScroll: true });
  }

  async function handleHandoff() {
    const handedOff = await handoffLabCredential();
    if (!handedOff) return;
    await focusGetAssertion();
  }

  async function handleConfirmHandoff(event: MouseEvent) {
    event.preventDefault();
    const handedOff = await confirmLabHandoff();
    if (!handedOff) return;
    await focusGetAssertion();
  }

  function handlePresetDialogChange(open: boolean) {
    if (!open) cancelLabPreset();
  }

  function handleHandoffDialogChange(open: boolean) {
    if (!open) cancelLabHandoff();
  }
</script>

{#if $selectedSelector && $selectedDevice}
  <section class="lab-screen" aria-label={m.lab_title()}>
    <LabHeader
      device={$selectedDevice}
      presetID={$labState.presetID}
      isCustom={$labState.isCustom}
      dirty={scenarioDirty}
      pendingPresetID={$labState.pendingPresetID}
      disabled={controlsDisabled}
      onPresetChange={(presetID: LabPresetID) => requestLabPreset(presetID)}
    />

    <div class="lab-steps">
      <MakeCredentialStep
        lab={$labState}
        disabled={controlsDisabled}
        onDraftChange={updateLabMakeCredentialDraft}
        onRegenerateUserID={regenerateLabUserID}
        onRegenerateChallenge={regenerateLabMakeChallenge}
        onPreview={previewLabMakeCredential}
        onConfirm={confirmLabMakeCredential}
        onEdit={editLabMakeCredential}
        onNewRun={newLabMakeCredentialRun}
        onHandoff={handleHandoff}
      />
      <GetAssertionStep
        lab={$labState}
        disabled={controlsDisabled}
        onDraftChange={updateLabGetAssertionDraft}
        onRegenerateChallenge={regenerateLabGetChallenge}
        onRun={runLabGetAssertion}
        onRunAgain={rerunLabGetAssertion}
        onEdit={editLabGetAssertion}
        onNewRun={newLabGetAssertionRun}
      />
    </div>
  </section>

  <AlertDialog.Root open={presetDialogOpen} onOpenChange={handlePresetDialogChange}>
    {#if $labState.pendingPresetID}
      <AlertDialog.Content class="lab-confirmation-dialog">
        <AlertDialog.Header>
          <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
          <AlertDialog.Title>{m.lab_preset_dirty_title()}</AlertDialog.Title>
          <AlertDialog.Description>{m.lab_preset_dirty_description()}</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={cancelLabPreset}>{m.lab_cancel()}</AlertDialog.Cancel>
          <AlertDialog.Action onclick={confirmLabPreset}>{m.lab_apply_preset()}</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    {/if}
  </AlertDialog.Root>

  <AlertDialog.Root open={handoffDialogOpen} onOpenChange={handleHandoffDialogChange}>
    {#if $labState.pendingHandoff}
      <AlertDialog.Content class="lab-confirmation-dialog">
        <AlertDialog.Header>
          <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
          <AlertDialog.Title>{m.lab_handoff_replace_title()}</AlertDialog.Title>
          <AlertDialog.Description>{m.lab_handoff_replace_description()}</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={cancelLabHandoff}>{m.lab_cancel()}</AlertDialog.Cancel>
          <AlertDialog.Action onclick={handleConfirmHandoff}>{m.lab_handoff_replace()}</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    {/if}
  </AlertDialog.Root>
{/if}

<style>
@layer blocks {
  .lab-screen,
  .lab-steps {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
  }

  :global(.lab-confirmation-dialog) {
    width: min(34rem, calc(100vw - 2rem));
    max-width: none;
  }

  @container workspace (min-width: 64rem) {
    .lab-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }
  }
}
</style>
