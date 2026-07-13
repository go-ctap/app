<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import type { LabClientDataMode } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    mode: LabClientDataMode;
    rawValue: string;
    disabled?: boolean;
    warning?: string | null;
    onModeChange: (value: LabClientDataMode) => void;
    onRawChange: (value: string) => void;
    onPrimary: () => unknown | Promise<unknown>;
  };

  let {
    id,
    mode,
    rawValue,
    disabled = false,
    warning = null,
    onModeChange,
    onRawChange,
    onPrimary,
  }: Props = $props();

  function handleModeChange(next: string | string[]) {
    if (Array.isArray(next) || !next) return;
    if (next === "builder" || next === "raw") onModeChange(next);
  }

  function handleRawInput(event: Event) {
    onRawChange((event.currentTarget as HTMLTextAreaElement).value);
  }

  function handleRawKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || disabled) return;
    event.preventDefault();
    void onPrimary();
  }
</script>

<Field.Set class="lab-client-data" data-disabled={disabled}>
  <Field.Legend>{m.lab_client_data()}</Field.Legend>
  <Field.Group>
    <Field.Field>
      <ToggleGroup.Root
        type="single"
        value={mode}
        variant="outline"
        size="sm"
        class="lab-client-data-mode"
        aria-label={m.lab_client_data()}
        {disabled}
        onValueChange={handleModeChange}
      >
        <ToggleGroup.Item value="builder">{m.lab_client_data_builder()}</ToggleGroup.Item>
        <ToggleGroup.Item value="raw">{m.lab_client_data_raw()}</ToggleGroup.Item>
      </ToggleGroup.Root>
      <Field.Description>
        {mode === "raw" ? m.lab_raw_description() : m.lab_builder_description()}
      </Field.Description>
    </Field.Field>

    {#if mode === "raw"}
      <Field.Field data-disabled={disabled}>
        <Field.Label for={`${id}-raw`}>{m.lab_raw_client_data()}</Field.Label>
        <InputGroup.Root>
          <InputGroup.Textarea
            id={`${id}-raw`}
            value={rawValue}
            rows={8}
            spellcheck="false"
            {disabled}
            oninput={handleRawInput}
            onkeydown={handleRawKeydown}
          />
          <InputGroup.Addon align="block-end">
            <InputGroup.Text>{m.lab_textarea_shortcut()}</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup.Root>
      </Field.Field>

      {#if warning}
        <Alert.Root variant="warning" role="status">
          <Alert.Description>{warning}</Alert.Description>
        </Alert.Root>
      {/if}
    {/if}
  </Field.Group>
</Field.Set>

<style>
@layer blocks {
  :global(.lab-client-data) {
    min-width: 0;
  }

  :global(.lab-client-data-mode) {
    width: 100%;
  }

  :global(.lab-client-data-mode [data-slot="toggle-group-item"]) {
    flex: 1 1 50%;
  }

  :global(.lab-client-data [data-slot="input-group"]) {
    min-width: 0;
  }
}
</style>
