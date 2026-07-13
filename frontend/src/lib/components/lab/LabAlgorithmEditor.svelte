<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    values: string[];
    disabled?: boolean;
    invalid?: boolean;
    onChange: (values: string[]) => void;
    onPrimary: () => unknown | Promise<unknown>;
  };

  let { id, values, disabled = false, invalid = false, onChange, onPrimary }: Props = $props();

  function handleInput(event: Event) {
    onChange((event.currentTarget as HTMLTextAreaElement).value.split(/\r?\n/));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || disabled) return;
    event.preventDefault();
    void onPrimary();
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
      onkeydown={handleKeydown}
    />
    <InputGroup.Addon align="block-end">
      <InputGroup.Text>{m.lab_textarea_shortcut()}</InputGroup.Text>
    </InputGroup.Addon>
  </InputGroup.Root>
  <Field.Description>{m.lab_cose_algorithms_description()}</Field.Description>
</Field.Field>
