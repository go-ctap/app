<script lang="ts">
  import { ChevronDown, Pencil, RefreshCw, RotateCcw, Send } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
  import type { GetAssertionEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { getAssertionResult, operationError } from "$lib/ctapkit-results";
  import type {
    GetAssertionDraft,
    LabState,
  } from "$lib/features/lab/state";
  import { failureMessage as localizeFailure } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  import GetAssertionResult from "./GetAssertionResult.svelte";
  import LabClientDataEditor from "./LabClientDataEditor.svelte";
  import LabDescriptorEditor from "./LabDescriptorEditor.svelte";
  import LabDescriptorTransports from "./LabDescriptorTransports.svelte";
  import LabRawDisclosure from "./LabRawDisclosure.svelte";
  import LabTriStateSelect from "./LabTriStateSelect.svelte";
  import LabValidationIssues from "./LabValidationIssues.svelte";
  import LabVerificationFlow from "./LabVerificationFlow.svelte";

  type Props = {
    lab: LabState;
    disabled?: boolean;
    bytesToHex: (value: string) => string;
    onDraftChange: (patch: Partial<GetAssertionDraft>) => void;
    onRegenerateChallenge: () => void;
    onRun: () => void | Promise<boolean>;
    onRetry: () => void | Promise<boolean>;
    onEdit: () => void;
    onNewRun: () => void;
  };

  let {
    lab,
    disabled = false,
    bytesToHex,
    onDraftChange,
    onRegenerateChallenge,
    onRun,
    onRetry,
    onEdit,
    onNewRun,
  }: Props = $props();

  let advancedOpen = $state(false);
  let draft = $derived(lab.getDraft);
  let step = $derived(lab.getStep);
  let phase = $derived(step.phase);
  let locked = $derived(disabled || phase !== "editing");
  let responseEnvelope = $derived.by((): GetAssertionEnvelope | null => {
    if (step.phase === "success" || step.phase === "error") return step.responseEnvelope;
    return null;
  });
  let request = $derived.by(() => {
    if (step.phase === "executing" || step.phase === "success" || step.phase === "error") {
      return step.request;
    }
    return null;
  });
  let runtimeError = $derived(step.phase === "error" ? step.runtimeError : null);
  let result = $derived(getAssertionResult(responseEnvelope));
  let validationErrors = $derived(step.validation.errors);
  let validationWarnings = $derived(step.validation.warnings);
  let failureMessage = $derived.by(() => {
    if (step.phase !== "error") return null;
    if (step.failureReason === "missing-result") return m.lab_missing_result();
    return localizeFailure(step.runtimeError) ?? operationError(step.responseEnvelope) ?? m.lab_request_failed();
  });

  function phaseLabel() {
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

  function updateClientData(patch: Partial<GetAssertionDraft["clientData"]>) {
    onDraftChange({ clientData: { ...draft.clientData, ...patch } });
  }

  function handleSingleLineKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.isComposing || locked) return;
    event.preventDefault();
    void onRun();
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
    if (phase === "editing") void onRun();
  }
</script>

<Card.Root class="lab-step-card" data-phase={phase}>
  <Card.Header>
    <Card.Title>
      <h2 id="lab-get-assertion-heading" tabindex="-1">{m.lab_get_assertion_step()}</h2>
    </Card.Title>
    <Card.Description>{m.lab_get_assertion_description()}</Card.Description>
    <Card.Action><Badge variant={phase === "error" ? "destructive" : "outline"}>{phaseLabel()}</Badge></Card.Action>
  </Card.Header>

  <Card.Content>
    <form class="lab-step-form" aria-labelledby="lab-get-assertion-heading" onsubmit={handleSubmit}>
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
            responseEnvelope,
            runtimeError,
          }}
        />
      {/if}

      <Field.Set disabled={locked} data-disabled={locked}>
        <Field.Legend>{m.lab_basic_fields()}</Field.Legend>
        <Field.Group class="lab-basic-grid">
          <Field.Field
            class="lab-field-wide"
            data-disabled={locked}
            data-invalid={fieldInvalid("get.rpID")}
          >
            <Field.Label for="lab-get-rp-id">{m.lab_rp_id()}</Field.Label>
            <Input
              id="lab-get-rp-id"
              value={draft.rpID}
              disabled={locked}
              aria-invalid={fieldInvalid("get.rpID")}
              oninput={(event) => onDraftChange({ rpID: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("get.clientData.origin")}>
            <Field.Label for="lab-get-origin">{m.lab_origin()}</Field.Label>
            <Input
              id="lab-get-origin"
              value={draft.clientData.origin}
              disabled={locked}
              aria-invalid={fieldInvalid("get.clientData.origin")}
              oninput={(event) => updateClientData({ origin: event.currentTarget.value })}
              onkeydown={handleSingleLineKeydown}
            />
          </Field.Field>
          <Field.Field data-disabled={locked} data-invalid={fieldInvalid("get.clientData.challenge")}>
            <Field.Label for="lab-get-challenge">{m.lab_challenge()}</Field.Label>
            <InputGroup.Root>
              <InputGroup.Input
                id="lab-get-challenge"
                value={draft.clientData.challenge}
                spellcheck="false"
                disabled={locked}
                aria-invalid={fieldInvalid("get.clientData.challenge")}
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
        </Field.Group>
      </Field.Set>

      <LabDescriptorEditor
        id="lab-get-allow"
        label={m.lab_allow_list()}
        description={m.lab_allow_list_description()}
        descriptors={draft.allowList}
        disabled={locked}
        invalidIndices={descriptorInvalidIndices("get.allowList")}
        onChange={(allowList) => onDraftChange({ allowList })}
        onPrimary={onRun}
      />

      <Collapsible.Root class="lab-advanced" bind:open={advancedOpen}>
        <Collapsible.Trigger
          class={buttonVariants({ variant: "outline", size: "sm", class: "lab-advanced-trigger" })}
        >
          <span>{m.lab_advanced_fields()}</span>
          <ChevronDown class="lab-advanced-chevron" aria-hidden="true" />
        </Collapsible.Trigger>
        <Collapsible.Content class="lab-advanced-content">
          <Field.Group>
            <LabDescriptorTransports
              descriptors={draft.allowList}
              disabled={locked}
              onChange={(allowList) => onDraftChange({ allowList })}
            />
            <Field.Set disabled={locked} data-disabled={locked}>
              <Field.Legend>{m.lab_options()}</Field.Legend>
              <Field.Group class="lab-option-grid">
                <LabTriStateSelect
                  id="lab-get-resident-key"
                  label={m.lab_resident_key()}
                  value={draft.residentKey}
                  disabled={locked}
                  onChange={(residentKey) => onDraftChange({ residentKey })}
                />
                <LabTriStateSelect
                  id="lab-get-user-presence"
                  label={m.lab_user_presence()}
                  value={draft.userPresence}
                  disabled={locked}
                  onChange={(userPresence) => onDraftChange({ userPresence })}
                />
                <LabTriStateSelect
                  id="lab-get-user-verification"
                  label={m.lab_user_verification()}
                  value={draft.userVerification}
                  disabled={locked}
                  onChange={(userVerification) => onDraftChange({ userVerification })}
                />
              </Field.Group>
            </Field.Set>

            <LabVerificationFlow
              id="lab-get-verification"
              value={draft.verificationFlow === VerificationFlow.VerificationFlowPIN ? "pin" : "auto"}
              disabled={locked}
              onChange={handleVerificationChange}
            />
            <LabClientDataEditor
              id="lab-get-client-data"
              mode={draft.clientData.mode}
              rawValue={draft.clientData.rawJSON}
              disabled={locked}
              warning={draft.clientData.mode === "raw" && validationWarnings.length
                ? m.lab_raw_json_warning()
                : null}
              onModeChange={(mode) => updateClientData({ mode })}
              onRawChange={(rawJSON) => updateClientData({ rawJSON })}
              onPrimary={onRun}
            />
          </Field.Group>
        </Collapsible.Content>
      </Collapsible.Root>

      {#if request && phase !== "executing"}
        <LabRawDisclosure title={m.lab_normalized_request()} value={request} />
      {/if}

      {#if result}
        <GetAssertionResult {result} {responseEnvelope} {runtimeError} {bytesToHex} />
      {/if}
    </form>
  </Card.Content>

  <Card.Footer class="lab-step-actions">
    {#if phase === "editing"}
      <Button type="button" {disabled} onclick={onRun}>
        <Send data-icon="inline-start" aria-hidden="true" />
        {m.lab_run_assertion()}
      </Button>
    {:else if phase === "executing"}
      <Button type="button" disabled>
        <Spinner data-icon="inline-start" aria-hidden="true" />
        {m.lab_run_assertion()}
      </Button>
    {:else if phase === "success"}
      <Button variant="outline" type="button" {disabled} onclick={onEdit}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        {m.lab_edit()}
      </Button>
      <Button type="button" {disabled} onclick={onNewRun}>
        <RotateCcw data-icon="inline-start" aria-hidden="true" />
        {m.lab_new_run()}
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
      {#if step.phase === "error" && step.failureReason !== "invalid-session"}
        <Button type="button" {disabled} onclick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {m.lab_retry()}
        </Button>
      {/if}
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
