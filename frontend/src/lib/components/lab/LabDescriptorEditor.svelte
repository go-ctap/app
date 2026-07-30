<script lang="ts">
  import { Plus, X } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import * as InputGroup from "$lib/components/ui/input-group";
  import type { LabDescriptorDraft } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    label: string;
    description: string;
    descriptors: LabDescriptorDraft[];
    disabled?: boolean;
    invalidIndices?: number[];
    onChange: (descriptors: LabDescriptorDraft[]) => void;
    onPrimary: () => unknown | Promise<unknown>;
  };

  let {
    id,
    label,
    description,
    descriptors,
    disabled = false,
    invalidIndices = [],
    onChange,
    onPrimary,
  }: Props = $props();

  function updateID(index: number, credentialIDHex: string) {
    onChange(
      descriptors.map((descriptor, current) =>
        current === index ? { ...descriptor, credentialIDHex } : descriptor,
      ),
    );
  }

  function removeDescriptor(index: number) {
    onChange(descriptors.filter((_, current) => current !== index));
  }

  function addDescriptor() {
    onChange([...descriptors, { credentialIDHex: "" }]);
  }

  function handleSingleLineKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.isComposing || disabled) return;

    event.preventDefault();
    void onPrimary();
  }
</script>

<Field.Set class="lab-descriptor-editor" data-disabled={disabled}>
  <Field.Legend>{label}</Field.Legend>
  <Field.Description>{description}</Field.Description>
  <Field.Group>
    {#each descriptors as descriptor, index (`${id}-${index}`)}
      <Field.Field
        class="lab-descriptor-row"
        data-disabled={disabled}
        data-invalid={invalidIndices.includes(index)}
      >
        <Field.Label for={`${id}-${index}`} class="sr-only">
          {label}
          {index + 1}
        </Field.Label>
        <InputGroup.Root>
          <InputGroup.Addon>
            <InputGroup.Text>public-key</InputGroup.Text>
          </InputGroup.Addon>
          <InputGroup.Input
            id={`${id}-${index}`}
            value={descriptor.credentialIDHex}
            spellcheck="false"
            autocomplete="off"
            {disabled}
            aria-invalid={invalidIndices.includes(index)}
            oninput={(event) => updateID(index, event.currentTarget.value)}
            onkeydown={handleSingleLineKeydown}
          />
          <InputGroup.Addon align="inline-end">
            <InputGroup.Button
              size="icon-xs"
              aria-label={m.lab_remove()}
              title={m.lab_remove()}
              {disabled}
              onclick={() => removeDescriptor(index)}
            >
              <X aria-hidden="true" />
            </InputGroup.Button>
          </InputGroup.Addon>
        </InputGroup.Root>
      </Field.Field>
    {/each}

    <Button variant="outline" size="sm" type="button" {disabled} onclick={addDescriptor}>
      <Plus data-icon="inline-start" aria-hidden="true" />
      {m.lab_add_descriptor()}
    </Button>
  </Field.Group>
</Field.Set>

<style>
  @layer blocks {
    :global(.lab-descriptor-editor),
    :global(.lab-descriptor-row),
    :global(.lab-descriptor-row [data-slot="input-group"]) {
      min-width: 0;
    }

    :global(.lab-descriptor-row) {
      padding: var(--space-2);
      border: 1px solid var(--border);
    }
  }
</style>
