<script lang="ts">
  import { tick } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";

  import GetAssertionStep from "$lib/components/lab/GetAssertionStep.svelte";
  import LabHeader from "$lib/components/lab/LabHeader.svelte";
  import MakeCredentialStep from "$lib/components/lab/MakeCredentialStep.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import {
    cancelLabHandoff,
    confirmLabHandoff,
    confirmLabGetAssertion,
    confirmLabMakeCredential,
    editLabGetAssertion,
    editLabMakeCredential,
    fillLabDemoValues,
    handoffLabCredential,
    newLabGetAssertionRun,
    newLabMakeCredentialRun,
    previewLabMakeCredential,
    regenerateLabGetChallenge,
    regenerateLabMakeChallenge,
    regenerateLabUserID,
    rerunLabGetAssertion,
    runLabGetAssertion,
    selectLabOperation,
    updateLabGetAssertionDraft,
    updateLabMakeCredentialDraft,
  } from "$lib/features/lab";
  import { labState } from "$lib/features/lab";
  import {
    authenticatorInspection,
    authenticatorBusy,
    selectedDevice,
    selectedSelector,
  } from "$lib/features/authenticator";
  import { reloadOverview } from "$lib/features/overview";

  import { m } from "../paraglide/messages.js";

  let handoffDialogOpen = $derived(Boolean($labState.pendingHandoff));
  let controlsDisabled = $derived($authenticatorBusy);
  let demoValuesDisabled = $derived.by(() => {
    const step = $labState.activeOperation === "make" ? $labState.makeStep : $labState.getStep;
    const editable = step.phase === "editing" || (step.phase === "error" && step.request === null);
    return controlsDisabled || !editable;
  });

  async function focusGetAssertion() {
    await tick();
    const heading = document.getElementById("lab-get-assertion-heading");
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

  function handleHandoffDialogChange(open: boolean) {
    if (!open) cancelLabHandoff();
  }
</script>

{#if $selectedSelector && $selectedDevice}
  <section class="lab-screen" aria-label={m.lab_title()}>
    <LabHeader
      device={$selectedDevice}
      disabled={demoValuesDisabled}
      onFillDemoValues={fillLabDemoValues}
    />

    <Tabs.Root
      value={$labState.activeOperation}
      onValueChange={(operation) => {
        if (operation === "make" || operation === "get") selectLabOperation(operation);
      }}
      class="lab-operation-tabs"
    >
      <Tabs.List aria-label={m.lab_title()}>
        <Tabs.Trigger value="make">{m.lab_make_credential()}</Tabs.Trigger>
        <Tabs.Trigger value="get">{m.lab_get_assertion()}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="make" class="lab-operation-panel">
        <MakeCredentialStep
          lab={$labState}
          inspection={$authenticatorInspection}
          disabled={controlsDisabled}
          onDraftChange={updateLabMakeCredentialDraft}
          onRegenerateUserID={regenerateLabUserID}
          onRegenerateChallenge={regenerateLabMakeChallenge}
          onPreview={previewLabMakeCredential}
          onConfirm={confirmLabMakeCredential}
          onEdit={editLabMakeCredential}
          onNewRun={newLabMakeCredentialRun}
          onHandoff={handleHandoff}
          onRetryInspection={reloadOverview}
        />
      </Tabs.Content>
      <Tabs.Content value="get" class="lab-operation-panel">
        <GetAssertionStep
          lab={$labState}
          inspection={$authenticatorInspection}
          disabled={controlsDisabled}
          onDraftChange={updateLabGetAssertionDraft}
          onRegenerateChallenge={regenerateLabGetChallenge}
          onPreview={runLabGetAssertion}
          onConfirm={confirmLabGetAssertion}
          onRetry={rerunLabGetAssertion}
          onEdit={editLabGetAssertion}
          onNewRun={newLabGetAssertionRun}
          onRetryInspection={reloadOverview}
        />
      </Tabs.Content>
    </Tabs.Root>
  </section>

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
  .lab-screen {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
  }

  :global(.lab-confirmation-dialog) {
    width: min(34rem, calc(100vw - 2rem));
    max-width: none;
  }

  :global(.lab-operation-tabs),
  :global(.lab-operation-panel) {
    min-width: 0;
  }

  :global(.lab-operation-tabs > [data-slot="tabs-list"]) {
    width: min(30rem, 100%);
  }

  :global(.lab-operation-panel) {
    padding-top: var(--space-3);
  }
}
</style>
