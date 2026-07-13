<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
  };

  let { id, value, disabled = false, onChange }: Props = $props();

  function handleValueChange(next: string | string[]) {
    if (Array.isArray(next) || !next) return;
    onChange(next);
  }
</script>

<Field.Field data-disabled={disabled}>
  <Field.Label id={`${id}-label`}>{m.lab_verification_flow()}</Field.Label>
  <ToggleGroup.Root
    type="single"
    {value}
    variant="outline"
    size="sm"
    class="lab-verification-flow"
    aria-labelledby={`${id}-label`}
    {disabled}
    onValueChange={handleValueChange}
  >
    <ToggleGroup.Item value="auto">{m.lab_verification_auto()}</ToggleGroup.Item>
    <ToggleGroup.Item value="pin">{m.lab_verification_pin()}</ToggleGroup.Item>
  </ToggleGroup.Root>
</Field.Field>

<style>
@layer blocks {
  :global(.lab-verification-flow) {
    width: 100%;
  }

  :global(.lab-verification-flow [data-slot="toggle-group-item"]) {
    flex: 1 1 50%;
  }
}
</style>
