<script lang="ts">
  import type { StatusReport } from "../../../../bindings/github.com/telesma-app/kit/model/config";

  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import type {
    SecurityMutationValidationError,
    SecurityPINPolicyDraft,
  } from "$lib/features/security/state";

  import { m } from "../../../paraglide/messages.js";
  import { reportedNumber } from "$lib/components/security/security-ui.js";

  type Props = {
    report: StatusReport;
    disabled: boolean;
    validationError: SecurityMutationValidationError | null;
    onChange: (draft: SecurityPINPolicyDraft) => void | Promise<boolean>;
    onEdit: () => void;
  };

  let { report, disabled, validationError, onChange, onEdit }: Props = $props();

  let minPINLength = $state("");
  let rpIDs = $state("");
  let forceChangePin = $state(false);
  let pinComplexityPolicy = $state(false);

  let maxPINLength = $derived(report.pin.maxPINLength);

  let minPINInvalid = $derived(
    ["min-pin-length-invalid", "min-pin-length-decrease", "min-pin-length-too-large"].includes(
      validationError ?? "",
    ),
  );

  let rpIDsInvalid = $derived(validationError === "too-many-rp-ids");

  function resetValidation() {
    if (validationError) onEdit();
  }

  function validationMessage(error: SecurityMutationValidationError | null) {
    if (error === "no-change") return m.security_pin_policy_no_change();
    if (error === "min-pin-length-invalid") return m.security_pin_policy_invalid();
    if (error === "min-pin-length-decrease") return m.security_pin_policy_decrease();
    if (error === "min-pin-length-too-large") return m.security_pin_policy_too_large();
    if (error === "too-many-rp-ids") return m.security_pin_policy_too_many_rp_ids();

    return "";
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (disabled) return;

    void onChange({ minPINLength, rpIDs, forceChangePin, pinComplexityPolicy });
  }
</script>

<form class="pin-policy-form" onsubmit={handleSubmit}>
  <Field.FieldGroup>
    <Field.Field
      data-invalid={minPINInvalid ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <Field.Label for="security-min-pin-length">{m.security_minimum_pin_length()}</Field.Label>
      <Input
        id="security-min-pin-length"
        type="number"
        inputmode="numeric"
        min={report.pin.minPINLength}
        max={maxPINLength}
        step="1"
        value={minPINLength}
        {disabled}
        aria-invalid={minPINInvalid}
        oninput={(event) => {
          minPINLength = event.currentTarget.value;
          resetValidation();
        }}
      />
      <Field.Description>
        {m.security_minimum_pin_length_optional()} ·
        {m.security_minimum_pin_length()}: {reportedNumber(report.pin.minPINLength)} ·
        {m.security_maximum_pin_length()}: {maxPINLength}
      </Field.Description>
      {#if minPINInvalid}
        <Field.Error>{validationMessage(validationError)}</Field.Error>
      {/if}
    </Field.Field>

    <Field.Field
      data-invalid={rpIDsInvalid ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <Field.Label for="security-pin-policy-rp-ids">{m.security_rp_ids()}</Field.Label>
      <Textarea
        id="security-pin-policy-rp-ids"
        value={rpIDs}
        {disabled}
        aria-invalid={rpIDsInvalid}
        autocomplete="off"
        spellcheck="false"
        oninput={(event) => {
          rpIDs = event.currentTarget.value;
          resetValidation();
        }}
      />
      <Field.Description>
        {m.security_rp_ids_description()}
        {#if report.limits.maxRPIDsForSetMinPINLength != null}
          ({report.limits.maxRPIDsForSetMinPINLength})
        {/if}
      </Field.Description>
      {#if rpIDsInvalid}
        <Field.Error>{validationMessage(validationError)}</Field.Error>
      {/if}
    </Field.Field>
  </Field.FieldGroup>

  <Field.Set>
    <Field.Legend variant="label">{m.security_pin_policy_options()}</Field.Legend>
    <Field.Description>{m.security_pin_policy_advisory()}</Field.Description>
    <Field.Group>
      <Field.Field
        orientation="horizontal"
        data-disabled={disabled || report.pin.forcePINChange === true ? "true" : undefined}
      >
        <Checkbox
          id="security-force-pin-change"
          checked={report.pin.forcePINChange === true || forceChangePin}
          disabled={disabled || report.pin.forcePINChange === true}
          onCheckedChange={(checked) => {
            forceChangePin = checked;
            resetValidation();
          }}
        />
        <Field.Content>
          <Field.Label for="security-force-pin-change">{m.security_force_pin_change()}</Field.Label>
          <Field.Description>{m.security_force_pin_change_description()}</Field.Description>
        </Field.Content>
      </Field.Field>

      <Field.Field
        orientation="horizontal"
        data-disabled={disabled || report.pin.pinComplexityPolicy === true ? "true" : undefined}
      >
        <Checkbox
          id="security-pin-complexity"
          checked={report.pin.pinComplexityPolicy === true || pinComplexityPolicy}
          disabled={disabled || report.pin.pinComplexityPolicy === true}
          onCheckedChange={(checked) => {
            pinComplexityPolicy = checked;
            resetValidation();
          }}
        />
        <Field.Content>
          <Field.Label for="security-pin-complexity">{m.security_pin_complexity()}</Field.Label>
          <Field.Description>{m.security_pin_complexity_description()}</Field.Description>
        </Field.Content>
      </Field.Field>
    </Field.Group>
  </Field.Set>

  {#if validationError === "no-change"}
    <Alert.Root variant="warning" role="alert">
      <Alert.Title>{m.security_pin_policy()}</Alert.Title>
      <Alert.Description>{validationMessage(validationError)}</Alert.Description>
    </Alert.Root>
  {/if}

  <div class="pin-policy-actions">
    <Button type="submit" {disabled}>{m.preview_change()}</Button>
  </div>
</form>

<style>
  @layer blocks {
    .pin-policy-form {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .pin-policy-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
    }
  }
</style>
