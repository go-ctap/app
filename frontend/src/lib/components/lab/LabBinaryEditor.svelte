<script lang="ts">
  import type { LabBinaryDraft } from "$lib/features/lab/state";
  import { binaryDraftByteLength } from "$lib/lab-input";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    label: string;
    draft: LabBinaryDraft;
    disabled?: boolean;
    invalid?: boolean;
    onChange: (draft: LabBinaryDraft) => void;
  };

  let { id, label, draft, disabled = false, invalid = false, onChange }: Props = $props();

  let byteLength = $derived(binaryDraftByteLength(draft));

  function changeMode(mode: string) {
    if (mode !== "utf8" && mode !== "hex") return;

    onChange({ ...draft, mode });
  }
</script>

<Field.Field data-disabled={disabled} data-invalid={invalid}>
  <div class="lab-binary-heading">
    <Field.Label for={id}>{label}</Field.Label>
    <ToggleGroup.Root
      type="single"
      value={draft.mode}
      {disabled}
      variant="outline"
      size="sm"
      onValueChange={changeMode}
      aria-label={m.lab_binary_value()}
    >
      <ToggleGroup.Item value="utf8">{m.lab_utf8()}</ToggleGroup.Item>
      <ToggleGroup.Item value="hex">{m.lab_hex()}</ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>
  <Input
    {id}
    value={draft.value}
    spellcheck="false"
    {disabled}
    aria-invalid={invalid}
    oninput={(event) => onChange({ ...draft, value: event.currentTarget.value })}
  />
  <Field.Description>
    {byteLength === null ? m.lab_invalid_hex() : m.lab_byte_count({ count: byteLength })}
  </Field.Description>
</Field.Field>

<style>
  @layer blocks {
    .lab-binary-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
  }
</style>
