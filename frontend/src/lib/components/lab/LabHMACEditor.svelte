<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";

  import type { LabHMACSecretDraft } from "$lib/features/lab/state";
  import { randomHex } from "$lib/lab-input";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    id: string;
    value: LabHMACSecretDraft;
    disabled?: boolean;
    invalidSalt1?: boolean;
    invalidSalt2?: boolean;
    onChange: (value: LabHMACSecretDraft) => void;
  };

  let {
    id,
    value,
    disabled = false,
    invalidSalt1 = false,
    invalidSalt2 = false,
    onChange,
  }: Props = $props();
</script>

<div class="lab-hmac-editor">
  <Field.Field data-invalid={invalidSalt1} data-disabled={disabled}>
    <div class="lab-hmac-heading">
      <Field.Label for={`${id}-salt-1`}>{m.lab_salt_one()}</Field.Label>
      <Button
        type="button"
        size="xs"
        variant="outline"
        {disabled}
        onclick={() => onChange({ ...value, salt1Hex: randomHex(32) })}
      >
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {m.lab_generate()}
      </Button>
    </div>
    <Input
      id={`${id}-salt-1`}
      value={value.salt1Hex}
      spellcheck="false"
      {disabled}
      aria-invalid={invalidSalt1}
      oninput={(event) => onChange({ ...value, salt1Hex: event.currentTarget.value })}
    />
    <Field.Description>{m.lab_invalid_length()}</Field.Description>
  </Field.Field>

  <label class="lab-hmac-second-toggle">
    <Switch
      checked={value.salt2Enabled}
      {disabled}
      onCheckedChange={(salt2Enabled) => onChange({ ...value, salt2Enabled })}
    />
    <span>{m.lab_salt_two()}</span>
  </label>

  {#if value.salt2Enabled}
    <Field.Field data-invalid={invalidSalt2} data-disabled={disabled}>
      <div class="lab-hmac-heading">
        <Field.Label for={`${id}-salt-2`}>{m.lab_salt_two()}</Field.Label>
        <Button
          type="button"
          size="xs"
          variant="outline"
          {disabled}
          onclick={() => onChange({ ...value, salt2Hex: randomHex(32) })}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {m.lab_generate()}
        </Button>
      </div>
      <Input
        id={`${id}-salt-2`}
        value={value.salt2Hex}
        spellcheck="false"
        {disabled}
        aria-invalid={invalidSalt2}
        oninput={(event) => onChange({ ...value, salt2Hex: event.currentTarget.value })}
      />
      <Field.Description>{m.lab_invalid_length()}</Field.Description>
    </Field.Field>
  {/if}
</div>

<style>
  @layer blocks {
    .lab-hmac-editor {
      display: grid;
      gap: var(--space-3);
    }

    .lab-hmac-heading,
    .lab-hmac-second-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .lab-hmac-second-toggle {
      justify-content: flex-start;
      font-size: 0.72rem;
    }
  }
</style>
