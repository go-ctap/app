<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
  import type { InspectEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import type { GetAssertionDraft } from "$lib/features/lab/state";
  import type { LabValidationIssue } from "$lib/lab-input";
  import type { LoadState } from "$lib/load-state";

  import { m } from "../../../paraglide/messages.js";

  import GetAssertionExtensions from "./GetAssertionExtensions.svelte";
  import LabClientDataEditor from "./LabClientDataEditor.svelte";
  import LabDescriptorEditor from "./LabDescriptorEditor.svelte";
  import LabDescriptorTransports from "./LabDescriptorTransports.svelte";
  import LabTriStateSelect from "./LabTriStateSelect.svelte";
  import LabVerificationFlow from "./LabVerificationFlow.svelte";

  type Props = {
    draft: GetAssertionDraft;
    disabled?: boolean;
    errors: LabValidationIssue[];
    warnings: LabValidationIssue[];
    inspection: LoadState<InspectEnvelope>;
    onDraftChange: (patch: Partial<GetAssertionDraft>) => void;
    onRegenerateChallenge: () => void;
    onPrimary: () => void;
    onRetryInspection: () => void;
  };

  let {
    draft,
    disabled = false,
    errors,
    warnings,
    inspection,
    onDraftChange,
    onRegenerateChallenge,
    onPrimary,
    onRetryInspection,
  }: Props = $props();

  let extensionCount = $derived(Object.values(draft.extensions).filter((extension) => extension.included).length);

  function fieldInvalid(field: string) {
    return errors.some((issue) => issue.field === field);
  }

  function descriptorInvalidIndices(prefix: string) {
    return errors
      .filter((issue) => issue.field.startsWith(`${prefix}.`))
      .map((issue) => Number(issue.field.split(".")[2]))
      .filter(Number.isInteger);
  }

  function updateClientData(patch: Partial<GetAssertionDraft["clientData"]>) {
    onDraftChange({ clientData: { ...draft.clientData, ...patch } });
  }

  function handleSingleLineKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.isComposing || disabled) return;
    event.preventDefault();
    onPrimary();
  }

  function handleVerificationChange(value: string) {
    onDraftChange({
      verificationFlow: value === "pin"
        ? VerificationFlow.VerificationFlowPIN
        : VerificationFlow.VerificationFlowDefault,
    });
  }

</script>

<div class="lab-configure-sections">
  <section class="lab-configure-section" aria-labelledby="lab-get-basics-title">
    <header class="lab-configure-section-header">
      <h3 id="lab-get-basics-title">{m.lab_basics()}</h3>
      <p>{m.lab_basic_fields()}</p>
    </header>
    <Field.Set {disabled} data-disabled={disabled}>
      <Field.Legend class="sr-only">{m.lab_basic_fields()}</Field.Legend>
      <Field.Group class="lab-basic-grid">
        <Field.Field class="lab-field-wide" data-disabled={disabled} data-invalid={fieldInvalid("get.rpID")}>
          <Field.Label for="lab-get-rp-id">{m.lab_rp_id()}</Field.Label>
          <Input id="lab-get-rp-id" value={draft.rpID} {disabled} aria-invalid={fieldInvalid("get.rpID")} oninput={(event) => onDraftChange({ rpID: event.currentTarget.value })} onkeydown={handleSingleLineKeydown} />
        </Field.Field>
        <Field.Field data-disabled={disabled} data-invalid={fieldInvalid("get.clientData.origin")}>
          <Field.Label for="lab-get-origin">{m.lab_origin()}</Field.Label>
          <Input id="lab-get-origin" value={draft.clientData.origin} {disabled} aria-invalid={fieldInvalid("get.clientData.origin")} oninput={(event) => updateClientData({ origin: event.currentTarget.value })} onkeydown={handleSingleLineKeydown} />
        </Field.Field>
        <Field.Field data-disabled={disabled} data-invalid={fieldInvalid("get.clientData.challenge")}>
          <Field.Label for="lab-get-challenge">{m.lab_challenge()}</Field.Label>
          <InputGroup.Root>
            <InputGroup.Input id="lab-get-challenge" value={draft.clientData.challenge} spellcheck="false" {disabled} aria-invalid={fieldInvalid("get.clientData.challenge")} oninput={(event) => updateClientData({ challenge: event.currentTarget.value })} onkeydown={handleSingleLineKeydown} />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button size="sm" {disabled} onclick={onRegenerateChallenge}>
                <RefreshCw aria-hidden="true" />
                {m.lab_regenerate()}
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
        </Field.Field>
      </Field.Group>
    </Field.Set>
    <LabDescriptorEditor id="lab-get-allow" label={m.lab_allow_list()} description={m.lab_allow_list_description()} descriptors={draft.allowList} {disabled} invalidIndices={descriptorInvalidIndices("get.allowList")} onChange={(allowList) => onDraftChange({ allowList })} onPrimary={onPrimary} />
  </section>

  <Separator />

  <section class="lab-configure-section" aria-labelledby="lab-get-extensions-title">
    <header class="lab-configure-section-header">
      <h3 id="lab-get-extensions-title">{m.lab_extensions_count({ count: extensionCount })}</h3>
    </header>
    <GetAssertionExtensions
      value={draft.extensions}
      allowList={draft.allowList}
      {disabled}
      {inspection}
      {errors}
      onChange={(extensions) => onDraftChange({ extensions })}
      {onRetryInspection}
    />
  </section>

  <Separator />

  <section class="lab-configure-section" aria-labelledby="lab-get-advanced-title">
    <header class="lab-configure-section-header">
      <h3 id="lab-get-advanced-title">{m.lab_advanced()}</h3>
      <p>{m.lab_advanced_fields()}</p>
    </header>
    <Field.Group>
      <LabDescriptorTransports descriptors={draft.allowList} {disabled} onChange={(allowList) => onDraftChange({ allowList })} />
      <Field.Set {disabled} data-disabled={disabled}>
        <Field.Legend>{m.lab_options()}</Field.Legend>
        <Field.Group class="lab-option-grid">
          <LabTriStateSelect id="lab-get-resident-key" label={m.lab_resident_key()} value={draft.residentKey} {disabled} onChange={(residentKey) => onDraftChange({ residentKey })} />
          <LabTriStateSelect id="lab-get-user-presence" label={m.lab_user_presence()} value={draft.userPresence} {disabled} onChange={(userPresence) => onDraftChange({ userPresence })} />
          <LabTriStateSelect id="lab-get-user-verification" label={m.lab_user_verification()} value={draft.userVerification} {disabled} onChange={(userVerification) => onDraftChange({ userVerification })} />
        </Field.Group>
      </Field.Set>
      <LabVerificationFlow id="lab-get-verification" value={draft.verificationFlow === VerificationFlow.VerificationFlowPIN ? "pin" : "auto"} {disabled} onChange={handleVerificationChange} />
      <LabClientDataEditor id="lab-get-client-data" mode={draft.clientData.mode} rawValue={draft.clientData.rawJSON} {disabled} warning={draft.clientData.mode === "raw" && warnings.length ? m.lab_raw_json_warning() : null} onModeChange={(mode) => updateClientData({ mode })} onRawChange={(rawJSON) => updateClientData({ rawJSON })} onPrimary={onPrimary} />
    </Field.Group>
  </section>
</div>

<style>
@layer blocks {
  .lab-configure-sections,
  .lab-configure-section {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .lab-configure-section-header {
    display: grid;
    gap: var(--space-1);
  }

  .lab-configure-section-header h3,
  .lab-configure-section-header p {
    margin: 0;
  }

  .lab-configure-section-header h3 {
    font-size: 0.86rem;
  }

  .lab-configure-section-header p {
    color: var(--muted-foreground);
    font-size: 0.7rem;
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
</style>
