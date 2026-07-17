<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import type { LabEnterpriseAttestation } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    formats: string[];
    enterpriseAttestation: LabEnterpriseAttestation;
    disabled?: boolean;
    invalid?: boolean;
    onFormatsChange: (formats: string[]) => void;
    onEnterpriseAttestationChange: (value: LabEnterpriseAttestation) => void;
  };

  let {
    id,
    formats,
    enterpriseAttestation,
    disabled = false,
    invalid = false,
    onFormatsChange,
    onEnterpriseAttestationChange,
  }: Props = $props();

  function handleFormatsInput(event: Event) {
    const value = (event.currentTarget as HTMLTextAreaElement).value;
    onFormatsChange(value === "" ? [] : value.split(/\r?\n/));
  }

  function handleEnterpriseAttestationChange(next: string | string[]) {
    if (Array.isArray(next) || !next) return;
    const value = Number(next);
    if (value === 0 || value === 1 || value === 2) onEnterpriseAttestationChange(value);
  }
</script>

<Field.Set {disabled} data-disabled={disabled}>
  <Field.Legend>{m.lab_attestation()}</Field.Legend>
  <Field.Description>{m.lab_attestation_description()}</Field.Description>
  <Field.Group>
    <Field.Field data-disabled={disabled} data-invalid={invalid}>
      <Field.Label for={`${id}-formats`}>{m.lab_attestation_formats_preference()}</Field.Label>
      <InputGroup.Root>
        <InputGroup.Textarea
          id={`${id}-formats`}
          value={formats.join("\n")}
          rows={3}
          spellcheck="false"
          {disabled}
          aria-invalid={invalid}
          oninput={handleFormatsInput}
        />
      </InputGroup.Root>
      <Field.Description>{m.lab_attestation_formats_description()}</Field.Description>
    </Field.Field>

    <Field.Field data-disabled={disabled}>
      <Field.Label id={`${id}-enterprise-label`}>{m.lab_enterprise_attestation()}</Field.Label>
      <ToggleGroup.Root
        type="single"
        value={String(enterpriseAttestation)}
        variant="outline"
        size="sm"
        class="lab-enterprise-attestation"
        aria-labelledby={`${id}-enterprise-label`}
        {disabled}
        onValueChange={handleEnterpriseAttestationChange}
      >
        <ToggleGroup.Item value="0">{m.lab_enterprise_attestation_none()}</ToggleGroup.Item>
        <ToggleGroup.Item value="1">{m.lab_enterprise_attestation_vendor()}</ToggleGroup.Item>
        <ToggleGroup.Item value="2">{m.lab_enterprise_attestation_platform()}</ToggleGroup.Item>
      </ToggleGroup.Root>
      <Field.Description>{m.lab_enterprise_attestation_description()}</Field.Description>
    </Field.Field>
  </Field.Group>
</Field.Set>

<style>
@layer blocks {
  :global(.lab-enterprise-attestation) {
    width: 100%;
  }

  :global(.lab-enterprise-attestation [data-slot="toggle-group-item"]) {
    flex: 1 1 33.333%;
  }
}
</style>
