<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { LabTriState } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    label: string;
    value: LabTriState;
    disabled?: boolean;
    error?: string;
    onChange: (value: LabTriState) => void;
  };

  let { id, label, value, disabled = false, error, onChange }: Props = $props();

  function valueLabel(current: LabTriState) {
    if (current === "true") return m.lab_option_true();
    if (current === "false") return m.lab_option_false();
    return m.lab_option_auto();
  }

  function handleValueChange(next: string | string[]) {
    if (Array.isArray(next) || !next) return;
    if (next === "auto" || next === "true" || next === "false") onChange(next);
  }
</script>

<Field.Field data-invalid={Boolean(error)} data-disabled={disabled}>
  <Field.Label for={id}>{label}</Field.Label>
  <Select.Root type="single" {value} onValueChange={handleValueChange}>
    <Select.Trigger {id} class="lab-tri-state-trigger" {disabled} aria-invalid={Boolean(error)}>
      {valueLabel(value)}
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Item value="auto" label={m.lab_option_auto()}>{m.lab_option_auto()}</Select.Item>
        <Select.Item value="true" label={m.lab_option_true()}>{m.lab_option_true()}</Select.Item>
        <Select.Item value="false" label={m.lab_option_false()}>{m.lab_option_false()}</Select.Item>
      </Select.Group>
    </Select.Content>
  </Select.Root>
  {#if error}<Field.Error>{error}</Field.Error>{/if}
</Field.Field>

<style>
@layer blocks {
  :global(.lab-tri-state-trigger) {
    width: 100%;
  }
}
</style>
