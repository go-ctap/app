<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import * as InputGroup from "$lib/components/ui/input-group";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    values: string[];
    disabled?: boolean;
    invalid?: boolean;
    onChange: (values: string[]) => void;
  };

  let { id, values, disabled = false, invalid = false, onChange }: Props = $props();

  function handleInput(event: Event) {
    onChange((event.currentTarget as HTMLTextAreaElement).value.split(/\r?\n/));
  }
</script>

<Field.Field data-disabled={disabled} data-invalid={invalid}>
  <Field.Label for={id}>{m.lab_cose_algorithms()}</Field.Label>
  <InputGroup.Root>
    <InputGroup.Textarea
      {id}
      value={values.join("\n")}
      rows={4}
      spellcheck="false"
      {disabled}
      aria-invalid={invalid}
      oninput={handleInput}
    />
  </InputGroup.Root>
  <Field.Description>{m.lab_cose_algorithms_description()}</Field.Description>
</Field.Field>
