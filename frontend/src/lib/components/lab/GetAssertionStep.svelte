<script lang="ts">
  import { tick } from "svelte";
  import { Pencil, RotateCcw, Send, WandSparkles } from "@lucide/svelte";

  import type { GetAssertionEnvelope, InspectEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { getAssertionPreview, getAssertionResult, operationError } from "$lib/ctapkit-results";
  import type { GetAssertionDraft, LabConfigureSection, LabState } from "$lib/features/lab/state";
  import { failureMessage as localizeFailure } from "$lib/failure";
  import { validateGetAssertionDraft } from "$lib/lab-input";
  import type { LoadState } from "$lib/load-state";

  import { m } from "../../../paraglide/messages.js";

  import GetAssertionConfigure from "./GetAssertionConfigure.svelte";
  import GetAssertionResult from "./GetAssertionResult.svelte";
  import GetAssertionReview from "./GetAssertionReview.svelte";
  import LabValidationIssues from "./LabValidationIssues.svelte";
  import LabWorkflowSteps from "./LabWorkflowSteps.svelte";

  type Props = {
    lab: LabState;
    inspection: LoadState<InspectEnvelope>;
    disabled?: boolean;
    onSectionChange: (section: LabConfigureSection) => void;
    onDraftChange: (patch: Partial<GetAssertionDraft>) => void;
    onRegenerateChallenge: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    onEdit: () => void;
    onNewRun: () => void;
    onRetryInspection: () => void;
  };

  let {
    lab,
    inspection,
    disabled = false,
    onSectionChange,
    onDraftChange,
    onRegenerateChallenge,
    onPreview,
    onConfirm,
    onRetry,
    onEdit,
    onNewRun,
    onRetryInspection,
  }: Props = $props();

  let draft = $derived(lab.getDraft);
  let step = $derived(lab.getStep);
  let phase = $derived(step.phase);
  let previewEnvelope = $derived.by(() => {
    if (step.phase === "review" || step.phase === "executing" || step.phase === "success" || step.phase === "error") return step.previewEnvelope;
    return null;
  });
  let responseEnvelope = $derived.by((): GetAssertionEnvelope | null => {
    if (step.phase === "success" || step.phase === "error") return step.responseEnvelope;
    return null;
  });
  let preview = $derived(getAssertionPreview(previewEnvelope));
  let result = $derived(getAssertionResult(responseEnvelope));
  let validation = $derived(validateGetAssertionDraft(draft));
  let failureMessage = $derived.by(() => {
    if (step.phase !== "error") return null;
    return localizeFailure(step.runtimeError) ?? operationError(step.responseEnvelope) ?? m.lab_request_failed();
  });
  let previewFailed = $derived(step.phase === "error" && step.request === null);
  let executionFailed = $derived(step.phase === "error" && step.request !== null);
  let showConfigure = $derived(phase === "editing" || phase === "previewing" || previewFailed);

  function phaseLabel() {
    if (phase === "previewing") return m.lab_phase_previewing();
    if (phase === "review") return m.lab_phase_review();
    if (phase === "executing") return m.lab_phase_executing();
    if (phase === "success") return m.lab_phase_success();
    if (phase === "error") return m.lab_phase_error();
    return m.lab_phase_editing();
  }

  function sectionForField(field: string): LabConfigureSection {
    if (field.includes(".extensions.")) return "extensions";
    if (field.endsWith("rawJSON")) return "advanced";
    return "basics";
  }

  async function handlePreview() {
    if (!validation.valid) {
      onSectionChange(sectionForField(validation.errors[0].field));
      await tick();
      document.querySelector<HTMLElement>("#lab-get-configure [aria-invalid='true']")?.focus();
      return;
    }
    await onPreview();
  }
</script>

<Card.Root class="lab-step-card" data-phase={phase}>
  <Card.Header>
    <Card.Title><h2 id="lab-get-assertion-heading">{m.lab_get_assertion()}</h2></Card.Title>
    <Card.Description>{m.lab_get_assertion_description()}</Card.Description>
    <Card.Action><Badge variant={phase === "error" ? "destructive" : "outline"}>{phaseLabel()}</Badge></Card.Action>
  </Card.Header>

  <Card.Content class="lab-step-content">
    <LabWorkflowSteps {step} />

    {#if failureMessage}
      <Alert.Root variant="destructive" role="alert">
        <Alert.Title>{m.lab_request_failed()}</Alert.Title>
        <Alert.Description>{failureMessage}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if showConfigure}
      <section id="lab-get-configure" class="lab-configure-stage" aria-labelledby="lab-get-assertion-heading">
        <LabValidationIssues issues={validation.errors} severity="error" />
        <LabValidationIssues issues={validation.warnings} severity="warning" />
        <GetAssertionConfigure
          {draft}
          section={lab.getSection}
          disabled={disabled || phase === "previewing"}
          errors={validation.errors}
          warnings={validation.warnings}
          {inspection}
          {onSectionChange}
          {onDraftChange}
          {onRegenerateChallenge}
          onPrimary={handlePreview}
          {onRetryInspection}
        />
      </section>
    {:else if phase === "success" && result && responseEnvelope}
      <GetAssertionResult {result} {responseEnvelope} />
    {:else if preview}
      <GetAssertionReview {preview} />
    {/if}
  </Card.Content>

  <Card.Footer class="lab-step-actions">
    {#if phase === "editing"}
      <Button type="button" {disabled} onclick={handlePreview}><WandSparkles data-icon="inline-start" aria-hidden="true" />{m.lab_preview()}</Button>
    {:else if phase === "previewing"}
      <Button type="button" disabled><Spinner data-icon="inline-start" aria-hidden="true" />{m.lab_preview()}</Button>
    {:else if phase === "review"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}><Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}</Button>
      <Button type="button" {disabled} onclick={onConfirm}><Send data-icon="inline-start" aria-hidden="true" />{m.lab_execute()}</Button>
    {:else if phase === "executing"}
      <Button type="button" disabled><Spinner data-icon="inline-start" aria-hidden="true" />{m.lab_execute()}</Button>
    {:else if phase === "success"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}><Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}</Button>
      <Button type="button" {disabled} onclick={onNewRun}><RotateCcw data-icon="inline-start" aria-hidden="true" />{m.lab_new_run()}</Button>
    {:else if phase === "error"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}><Pencil data-icon="inline-start" aria-hidden="true" />{m.lab_edit()}</Button>
      <Button type="button" {disabled} onclick={onRetry}>
        {#if executionFailed}<Send data-icon="inline-start" aria-hidden="true" />{:else}<WandSparkles data-icon="inline-start" aria-hidden="true" />{/if}
        {previewFailed ? m.lab_retry_preview() : m.lab_retry()}
      </Button>
    {/if}
  </Card.Footer>
</Card.Root>

<style>
@layer blocks {
  :global(.lab-step-card) {
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

  :global(.lab-step-actions) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
  }
}
</style>
