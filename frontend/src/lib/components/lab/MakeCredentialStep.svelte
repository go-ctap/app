<script lang="ts">
  import { ChevronDown, Pencil, RefreshCw, RotateCcw, Send, WandSparkles } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
  import type { MakeCredentialEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { makeCredentialPreview, makeCredentialResult, operationError } from "$lib/ctapkit-results";
  import type {
    LabState,
    MakeCredentialDraft,
  } from "$lib/features/lab/state";
  import { failureMessage as localizeFailure } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  import LabAlgorithmEditor from "./LabAlgorithmEditor.svelte";
  import LabClientDataEditor from "./LabClientDataEditor.svelte";
  import LabDescriptorEditor from "./LabDescriptorEditor.svelte";
  import LabRawDisclosure from "./LabRawDisclosure.svelte";
  import MakeCredentialResult from "./MakeCredentialResult.svelte";
  import MakeCredentialReview from "./MakeCredentialReview.svelte";
  import LabTriStateSelect from "./LabTriStateSelect.svelte";
  import LabValidationIssues from "./LabValidationIssues.svelte";
  import LabVerificationFlow from "./LabVerificationFlow.svelte";

  type Props = {
    lab: LabState;
    disabled?: boolean;
    onDraftChange: (patch: Partial<MakeCredentialDraft>) => void;
    onRegenerateUserID: () => void;
    onRegenerateChallenge: () => void;
    onPreview: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    onEdit: () => void;
    onNewRun: () => void;
    onHandoff: () => void;
  };

  let {
    lab,
    disabled = false,
    onDraftChange,
    onRegenerateUserID,
    onRegenerateChallenge,
    onPreview,
    onConfirm,
    onRetry,
    onEdit,
    onNewRun,
    onHandoff,
  }: Props = $props();

  let advancedOpen = $state(false);
  let draft = $derived(lab.makeDraft);
  let step = $derived(lab.makeStep);
  let phase = $derived(step.phase);
  let locked = $derived(disabled || phase !== "editing");
  let previewEnvelope = $derived.by(() => {
    if (step.phase === "review" || step.phase === "executing" || step.phase === "success") {
      return step.previewEnvelope;
    }
    if (step.phase === "error") return step.previewEnvelope;
    return null;
  });
  let responseEnvelope = $derived.by((): MakeCredentialEnvelope | null => {
    if (step.phase === "success" || step.phase === "error") return step.responseEnvelope;
    return null;
  });
  let runtimeError = $derived(step.phase === "error" ? step.runtimeError : null);
  let preview = $derived(makeCredentialPreview(previewEnvelope));
  let result = $derived(makeCredentialResult(responseEnvelope));
  let reviewedRequest = $derived.by(() => {
    if (step.phase !== "editing") return step.previewRequest;
    return null;
  });
  let validationErrors = $derived(step.validation.errors);
  let validationWarnings = $derived(step.validation.warnings);
  let failureMessage = $derived.by(() => {
    if (step.phase !== "error") return null;
    if (step.failureReason === "missing-preview") return m.lab_missing_preview();
    if (step.failureReason === "missing-result") return m.lab_missing_result();
    return localizeFailure(step.runtimeError) ?? operationError(step.responseEnvelope) ?? m.lab_request_failed();
  });

  function phaseLabel() {
    if (phase === "previewing") return m.lab_phase_previewing();
    if (phase === "review") return m.lab_phase_review();
    if (phase === "executing") return m.lab_phase_executing();
    if (phase === "success") return m.lab_phase_success();
    if (phase === "error") return m.lab_phase_error();
    return m.lab_phase_editing();
  }

  function fieldInvalid(field: string) {
    return validationErrors.some((issue) => issue.field === field);
  }

  function descriptorInvalidIndices(prefix: string) {
    return validationErrors
      .filter((issue) => issue.field.startsWith(`${prefix}.`))
      .map((issue) => Number(issue.field.split(".")[2]))
      .filter(Number.isInteger);
  }

  function updateClientData(patch: Partial<MakeCredentialDraft["clientData"]>) {
    onDraftChange({ clientData: { ...draft.clientData, ...patch } });
  }

  function handleSingleLineKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.isComposing || locked) return;
    event.preventDefault();
    void onPreview();
  }

  function handleVerificationChange(value: string) {
    onDraftChange({
      verificationFlow: value === "pin"
        ? VerificationFlow.VerificationFlowPIN
        : VerificationFlow.VerificationFlowDefault,
    });
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (phase === "editing") void onPreview();
    if (phase === "review") void onConfirm();
  }
</script>

<Card.Root class="lab-step-card" data-phase={phase}>
  <Card.Header>
    <Card.Title><h2 id="lab-make-credential-heading">{m.lab_make_credential_step()}</h2></Card.Title>
    <Card.Description>{m.lab_make_credential_description()}</Card.Description>
    <Card.Action><Badge variant={phase === "error" ? "destructive" : "outline"}>{phaseLabel()}</Badge></Card.Action>
  </Card.Header>

  <Card.Content>
    <form class="lab-step-form" aria-labelledby="lab-make-credential-heading" onsubmit={handleSubmit}>
      <LabValidationIssues issues={validationErrors} severity="error" />
      <LabValidationIssues issues={validationWarnings} severity="warning" />

      {#if failureMessage}
        <Alert.Root variant="destructive" role="alert">
          <Alert.Title>{m.lab_request_failed()}</Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>
        <LabRawDisclosure
          title={m.lab_raw_response()}
          value={{
            previewRequest: step.phase === "error" ? step.previewRequest : null,
            previewEnvelope: step.phase === "error" ? step.previewEnvelope : null,
            responseEnvelope,
            runtimeError,
          }}
        />
      {/if}

      <Field.Set disabled={locked} data-disabled={locked}>
        <Field.Legend>{m.lab_basic_fields()}</Field.Legend>
        <Field.Group class="lab-basic-grid">
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.rpID")}>
            <Field.Label for="lab-make-rp-id">{m.lab_rp_id()}</Field.Label>
            <Input
              id="lab-make-rp-id"
              value={draft.rpID}
              disabled={locked}
              aria-invalid={fieldInvalid("make.rpID")}
              oninput={(event) => onDraftChange({ rpID: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.rpName")}>
            <Field.Label for="lab-make-rp-name">{m.lab_rp_name()}</Field.Label>
            <Input
              id="lab-make-rp-name"
              value={draft.rpName}
              disabled={locked}
              aria-invalid={fieldInvalid("make.rpName")}
              oninput={(event) => onDraftChange({ rpName: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field
            class="lab-field-wide"
            data-disabled={locked}
            data-invalid={fieldInvalid("make.userIDHex")}
          >
            <Field.Label for="lab-make-user-id">{m.lab_user_id_hex()}</Field.Label>
            <InputGroup.Root>
              <InputGroup.Input
                id="lab-make-user-id"
                value={draft.userIDHex}
                spellcheck="false"
                disabled={locked}
                aria-invalid={fieldInvalid("make.userIDHex")}
                oninput={(event) => onDraftChange({ userIDHex: event.currentTarget.value })}
                onkeydown={handleSingleLineKeydown}
              />
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button size="sm" disabled={locked} onclick={onRegenerateUserID}>
                  <RefreshCw aria-hidden="true" />
                  {m.lab_regenerate()}
                </InputGroup.Button>
              </InputGroup.Addon>
            </InputGroup.Root>
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.userName")}>
            <Field.Label for="lab-make-user-name">{m.lab_user_name()}</Field.Label>
            <Input
              id="lab-make-user-name"
              value={draft.userName}
              disabled={locked}
              aria-invalid={fieldInvalid("make.userName")}
              oninput={(event) => onDraftChange({ userName: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.userDisplayName")}>
            <Field.Label for="lab-make-display-name">{m.lab_display_name()}</Field.Label>
            <Input
              id="lab-make-display-name"
              value={draft.userDisplayName}
              disabled={locked}
              aria-invalid={fieldInvalid("make.userDisplayName")}
              oninput={(event) => onDraftChange({ userDisplayName: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.clientData.origin")}>
            <Field.Label for="lab-make-origin">{m.lab_origin()}</Field.Label>
            <Input
              id="lab-make-origin"
              value={draft.clientData.origin}
              disabled={locked}
              aria-invalid={fieldInvalid("make.clientData.origin")}
              oninput={(event) => updateClientData({ origin: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("make.clientData.challenge")}>
            <Field.Label for="lab-make-challenge">{m.lab_challenge()}</Field.Label>
            <InputGroup.Root>
              <InputGroup.Input
                id="lab-make-challenge"
                value={draft.clientData.challenge}
                spellcheck="false"
                disabled={locked}
                aria-invalid={fieldInvalid("make.clientData.challenge")}
                oninput={(event) => updateClientData({ challenge: event.currentTarget.value })}
                onkeydown={handleSingleLineKeydown}
              />
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button size="sm" disabled={locked} onclick={onRegenerateChallenge}>
                  <RefreshCw aria-hidden="true" />
                  {m.lab_regenerate()}
                </InputGroup.Button>
              </InputGroup.Addon>
            </InputGroup.Root>
          </Field.Field>
          <Field.Field>
            <Field.Label>{m.lab_credential_type()}</Field.Label>
            <output class="lab-fixed-value">public-key</output>
          </Field.Field>
        </Field.Group>
      </Field.Set>

      <Collapsible.Root class="lab-advanced" bind:open={advancedOpen}>
        <Collapsible.Trigger
          class={buttonVariants({ variant: "outline", size: "sm", class: "lab-advanced-trigger" })}
        >
          <span>{m.lab_advanced_fields()}</span>
          <ChevronDown class="lab-advanced-chevron" aria-hidden="true" />
        </Collapsible.Trigger>
        <Collapsible.Content class="lab-advanced-content">
          <Field.Group>
            <LabAlgorithmEditor
              id="lab-make-algorithms"
              values={draft.algorithms}
              disabled={locked}
              invalid={validationErrors.some((issue) => issue.field.startsWith("make.algorithms"))}
              onChange={(algorithms) => onDraftChange({ algorithms })}
              onPrimary={onPreview}
            />
            <LabDescriptorEditor
              id="lab-make-exclude"
              label={m.lab_exclude_list()}
              description={m.lab_exclude_list_description()}
              descriptors={draft.excludeList}
              disabled={locked}
              invalidIndices={descriptorInvalidIndices("make.excludeList")}
              onChange={(excludeList) => onDraftChange({ excludeList })}
              onPrimary={onPreview}
            />

            <Field.Set disabled={locked} data-disabled={locked}>
              <Field.Legend>{m.lab_options()}</Field.Legend>
              <Field.Group class="lab-option-grid">
                <LabTriStateSelect
                  id="lab-make-resident-key"
                  label={m.lab_resident_key()}
                  value={draft.residentKey}
                  disabled={locked}
                  onChange={(residentKey) => onDraftChange({ residentKey })}
                />
                <LabTriStateSelect
                  id="lab-make-user-presence"
                  label={m.lab_user_presence()}
                  value={draft.userPresence}
                  disabled={locked}
                  onChange={(userPresence) => onDraftChange({ userPresence })}
                />
                <LabTriStateSelect
                  id="lab-make-user-verification"
                  label={m.lab_user_verification()}
                  value={draft.userVerification}
                  disabled={locked}
                  onChange={(userVerification) => onDraftChange({ userVerification })}
                />
              </Field.Group>
            </Field.Set>

            <LabVerificationFlow
              id="lab-make-verification"
              value={draft.verificationFlow === VerificationFlow.VerificationFlowPIN ? "pin" : "auto"}
              disabled={locked}
              onChange={handleVerificationChange}
            />
            <LabClientDataEditor
              id="lab-make-client-data"
              mode={draft.clientData.mode}
              rawValue={draft.clientData.rawJSON}
              disabled={locked}
              warning={draft.clientData.mode === "raw" && validationWarnings.length
                ? m.lab_raw_json_warning()
                : null}
              onModeChange={(mode) => updateClientData({ mode })}
              onRawChange={(rawJSON) => updateClientData({ rawJSON })}
              onPrimary={onPreview}
            />
          </Field.Group>
        </Collapsible.Content>
      </Collapsible.Root>

      {#if preview && reviewedRequest}
        <MakeCredentialReview {preview} {reviewedRequest} />
      {/if}

      {#if result}
        <MakeCredentialResult {result} {responseEnvelope} {runtimeError} />
      {/if}
    </form>
  </Card.Content>

  <Card.Footer class="lab-step-actions">
    {#if phase === "editing"}
      <Button type="button" {disabled} onclick={onPreview}>
        <WandSparkles data-icon="inline-start" aria-hidden="true" />
        {m.lab_preview()}
      </Button>
    {:else if phase === "previewing"}
      <Button type="button" disabled>
        <Spinner data-icon="inline-start" aria-hidden="true" />
        {m.lab_preview()}
      </Button>
    {:else if phase === "review"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        {m.lab_edit()}
      </Button>
      <Button type="button" {disabled} onclick={onConfirm}>
        <Send data-icon="inline-start" aria-hidden="true" />
        {m.lab_confirm()}
      </Button>
    {:else if phase === "executing"}
      <Button type="button" disabled>
        <Spinner data-icon="inline-start" aria-hidden="true" />
        {m.lab_confirm()}
      </Button>
    {:else if phase === "success"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        {m.lab_edit()}
      </Button>
      <Button variant="outline" type="button" {disabled} onclick={onNewRun}>
        <RotateCcw data-icon="inline-start" aria-hidden="true" />
        {m.lab_new_run()}
      </Button>
      <Button type="button" {disabled} onclick={onHandoff}>
        <Send data-icon="inline-start" aria-hidden="true" />
        {m.lab_use_in_get_assertion()}
      </Button>
    {:else if phase === "error"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        {m.lab_edit()}
      </Button>
      <Button variant="outline" type="button" {disabled} onclick={onNewRun}>
        <RotateCcw data-icon="inline-start" aria-hidden="true" />
        {m.lab_new_run()}
      </Button>
      <Button type="button" {disabled} onclick={onRetry}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {m.lab_retry_preview()}
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

  .lab-step-form,
  :global(.lab-advanced-content) {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  :global(.lab-basic-grid),
  :global(.lab-option-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
  }

  :global(.lab-field-wide) {
    grid-column: 1 / -1;
  }

  .lab-fixed-value {
    min-height: 2rem;
    padding: var(--space-2);
    border: 1px solid var(--border);
    background: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }

  :global(.lab-advanced) {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  :global(.lab-advanced-trigger) {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  :global(.lab-advanced-chevron) {
    transition: transform 160ms ease;
  }

  :global(.lab-step-actions) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  @container workspace (max-width: 42rem) {
    :global(.lab-basic-grid),
    :global(.lab-option-grid) {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.lab-field-wide) {
      grid-column: auto;
    }
  }
}

@layer exceptions {
  :global(.lab-advanced[data-state="open"] .lab-advanced-chevron) {
    transform: rotate(180deg);
  }
}
</style>
