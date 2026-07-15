<script lang="ts">
  import type { LabPRFValuesDraft } from "$lib/features/lab/state";
  import { Switch } from "$lib/components/ui/switch/index.js";

  import { m } from "../../../paraglide/messages.js";

  import LabBinaryEditor from "./LabBinaryEditor.svelte";

  type Props = {
    id: string;
    value: LabPRFValuesDraft;
    disabled?: boolean;
    invalidFirst?: boolean;
    invalidSecond?: boolean;
    onChange: (value: LabPRFValuesDraft) => void;
  };

  let {
    id,
    value,
    disabled = false,
    invalidFirst = false,
    invalidSecond = false,
    onChange,
  }: Props = $props();
</script>

<div class="lab-prf-values">
  <LabBinaryEditor
    id={`${id}-first`}
    label={m.lab_first_value()}
    draft={value.first}
    {disabled}
    invalid={invalidFirst}
    onChange={(first) => onChange({ ...value, first })}
  />
  <label class="lab-prf-second-toggle">
    <Switch
      checked={value.secondEnabled}
      {disabled}
      onCheckedChange={(secondEnabled) => onChange({ ...value, secondEnabled })}
    />
    <span>{m.lab_second_value()}</span>
  </label>
  {#if value.secondEnabled}
    <LabBinaryEditor
      id={`${id}-second`}
      label={m.lab_second_value()}
      draft={value.second}
      {disabled}
      invalid={invalidSecond}
      onChange={(second) => onChange({ ...value, second })}
    />
  {/if}
</div>

<style>
@layer blocks {
  .lab-prf-values {
    display: grid;
    gap: var(--space-3);
  }

  .lab-prf-second-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.72rem;
  }
}
</style>
