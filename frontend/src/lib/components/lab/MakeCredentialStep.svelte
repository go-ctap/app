<script lang="ts">
  import { tick } from "svelte";
  import { Pencil, RotateCcw, Send, WandSparkles } from "@lucide/svelte";

  import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";
  import type { InspectEnvelope, MakeCredentialEnvelope } from "../../../../bindings/telesma/service";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { makeCredentialPreview, makeCredentialResult, operationError } from "$lib/ctapkit-results";
  import { inspectResult } from "$lib/ctapkit-results";
  import type { LabState, MakeCredentialDraft } from "$lib/features/lab/state";
  import { failureMessage as localizeFailure } from "$lib/failure";
  import { validateMakeCredentialDraft } from "$lib/lab-input";
  import type { LoadState } from "$lib/load-state";

  import { m } from "../../../paraglide/messages.js";

  import LabCommandCenter from "./LabCommandCenter.svelte";
  import LabValidationIssues from "./LabValidationIssues.svelte";
  import MakeCredentialConfigure from "./MakeCredentialConfigure.svelte";
  import MakeCredentialResult from "./MakeCredentialResult.svelte";
  import MakeCredentialReview from "./MakeCredentialReview.svelte";

  type Props = {
    lab: LabState;
    inspection: LoadState<InspectEnvelope>;
    device: DeviceReport;
    disabled?: boolean;
    fillDemoDisabled?: boolean;
    onDraftChange: (patch: Partial<MakeCredentialDraft>) => void;
    onRegenerateUserID: () => void;
    onRegenerateChallenge: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onEdit: () => void;
    onNewRun: () => void;
    onHandoff: () => void;
    onRetryAttestationTrust: () => void;
    onRetryVerification: () => void;
    onRetryInspection: () => void;
    onFillDemoValues: () => void;
  };

  let {
    lab,
    inspection,
    device,
    disabled = false,
    fillDemoDisabled = false,
    onDraftChange,
    onRegenerateUserID,
    onRegenerateChallenge,
    onPreview,
    onConfirm,
    onEdit,
    onNewRun,
    onHandoff,
    onRetryAttestationTrust,
    onRetryVerification,
    onRetryInspection,
    onFillDemoValues,
  }: Props = $props();

  let draft = $derived(lab.makeDraft);
  let step = $derived(lab.makeStep);
  let phase = $derived(step.phase);
  let previewEnvelope = $derived.by(() => {
    if (step.phase === "review" || step.phase === "executing" || step.phase === "success" || step.phase === "error") {
      return step.previewEnvelope;
    }
    return null;
  });
  let responseEnvelope = $derived.by((): MakeCredentialEnvelope | null => {
    if (step.phase === "success" || step.phase === "error") return step.responseEnvelope;
    return null;
  });
  let preview = $derived(makeCredentialPreview(previewEnvelope));
  let result = $derived(makeCredentialResult(responseEnvelope));
  let maxCredBlobLength = $derived(inspectResult(inspection.data)?.info.maxCredBlobLength);
  let validation = $derived(validateMakeCredentialDraft(draft, maxCredBlobLength));
  let extensionCount = $derived(Object.values(draft.extensions).filter((extension) => extension.included).length);
  let failureMessage = $derived.by(() => {
    if (step.phase !== "error") return null;
    return localizeFailure(step.runtimeError) ?? operationError(step.responseEnvelope) ?? m.lab_request_failed();
  });
  let previewFailed = $derived(step.phase === "error" && step.request === null);
  let executionFailed = $derived(step.phase === "error" && step.request !== null);
  let showConfigure = $derived(phase === "editing" || phase === "previewing" || previewFailed);

  async function handlePreview() {
    if (!validation.valid) {
      await tick();
      document.querySelector<HTMLElement>("#lab-make-configure [aria-invalid='true']")?.focus();
      return;
    }
    await onPreview();
  }
</script>

{#snippet actions()}
  {#if phase === "editing"}
    <Button class="lab-command-action" type="button" {disabled} onclick={handlePreview}>
      <WandSparkles data-icon="inline-start" aria-hidden="true" />
      {m.lab_preview()}
    </Button>
  {:else if phase === "previewing"}
    <Button class="lab-command-action" type="button" disabled>
      <Spinner data-icon="inline-start" aria-hidden="true" />{m.lab_preview()}
    </Button>
  {:else if phase === "review"}
    <Button class="lab-command-action" variant="outline" type="button" {disabled} onclick={onEdit}>
      <Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}
    </Button>
    <Button class="lab-command-action" type="button" {disabled} onclick={onConfirm}>
      <Send data-icon="inline-start" aria-hidden="true" />{m.lab_execute()}
    </Button>
  {:else if phase === "executing"}
    <Button class="lab-command-action" type="button" disabled>
      <Spinner data-icon="inline-start" aria-hidden="true" />{m.lab_execute()}
    </Button>
  {:else if phase === "success"}
    <Button class="lab-command-action" variant="outline" type="button" {disabled} onclick={onEdit}>
      <Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}
    </Button>
    <Button class="lab-command-action" variant="outline" type="button" {disabled} onclick={onNewRun}>
      <RotateCcw data-icon="inline-start" aria-hidden="true" />{m.lab_new_run()}
    </Button>
    <Button class="lab-command-action" type="button" {disabled} onclick={onHandoff}>
      <Send data-icon="inline-start" aria-hidden="true" />{m.lab_use_in_get_assertion()}
    </Button>
  {:else if phase === "error"}
    <Button class="lab-command-action" variant="outline" type="button" {disabled} onclick={onEdit}>
      <Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}
    </Button>
    {#if executionFailed}
      <Button class="lab-command-action" type="button" {disabled} onclick={onConfirm}>
        <Send data-icon="inline-start" aria-hidden="true" />{m.lab_retry()}
      </Button>
    {:else if previewFailed}
      <Button class="lab-command-action" type="button" {disabled} onclick={handlePreview}>
        <WandSparkles data-icon="inline-start" aria-hidden="true" />
        {m.lab_retry_preview()}
      </Button>
    {/if}
  {/if}
{/snippet}

<div class="lab-step-layout">
  <Card.Root class="lab-step-card" data-phase={phase}>
    <Card.Header>
      <Card.Title><h2 id="lab-make-credential-heading">{m.lab_make_credential()}</h2></Card.Title>
      <Card.Description>{m.lab_make_credential_description()}</Card.Description>
    </Card.Header>

    <Card.Content class="lab-step-content">
      {#if failureMessage}
        <Alert.Root variant="destructive" role="alert">
          <Alert.Title>{m.lab_request_failed()}</Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if showConfigure}
        <section id="lab-make-configure" class="lab-configure-stage" aria-labelledby="lab-make-credential-heading">
          <LabValidationIssues issues={validation.errors} severity="error" />
          <LabValidationIssues issues={validation.warnings} severity="warning" />
          <MakeCredentialConfigure
            {draft}
            disabled={disabled || phase === "previewing"}
            errors={validation.errors}
            warnings={validation.warnings}
            {inspection}
            {onDraftChange}
            {onRegenerateUserID}
            {onRegenerateChallenge}
            onPrimary={handlePreview}
            {onRetryInspection}
          />
        </section>
      {:else if phase === "success" && preview && result}
        <MakeCredentialResult
          {preview}
          {result}
          attestationTrust={lab.makeAttestationTrust}
          verification={lab.makeVerification}
          {onRetryAttestationTrust}
          {onRetryVerification}
        />
      {:else if preview}
        <MakeCredentialReview {preview} />
      {/if}
    </Card.Content>
  </Card.Root>

  <LabCommandCenter
    id="lab-make-command"
    operationLabel={m.lab_make_credential()}
    {device}
    {step}
    errorCount={validation.errors.length}
    warningCount={validation.warnings.length}
    {extensionCount}
    {fillDemoDisabled}
    {actions}
    {onFillDemoValues}
  />
</div>

<style>
@layer blocks {
  :global(.lab-step-card) {
    min-width: 0;
  }

  .lab-step-layout {
    min-width: 0;
  }

  :global(.lab-step-card [data-slot="card-title"] h2) {
    margin: 0;
    font: inherit;
  }

  :global(.lab-step-content),
  .lab-configure-stage {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }
}
</style>
