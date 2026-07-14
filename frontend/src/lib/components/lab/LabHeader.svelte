<script lang="ts">
  import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { LabPresetID } from "$lib/features/lab/state";
  import { deviceName } from "$lib/format";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    device: DeviceReport;
    presetID: LabPresetID;
    isCustom: boolean;
    dirty: boolean;
    pendingPresetID: LabPresetID | null;
    disabled?: boolean;
    onPresetChange: (presetID: LabPresetID) => void;
  };

  let {
    device,
    presetID,
    isCustom,
    dirty,
    pendingPresetID,
    disabled = false,
    onPresetChange,
  }: Props = $props();

  const presets: LabPresetID[] = [
    "minimal",
    "discoverable",
    "non-discoverable",
    "uv-required",
  ];
  let selectValue = $derived(pendingPresetID ?? (dirty ? "" : presetID));

  function presetLabel(value: LabPresetID) {
    if (value === "minimal") return m.lab_preset_minimal();
    if (value === "discoverable") return m.lab_preset_discoverable();
    if (value === "non-discoverable") return m.lab_preset_security_key();
    return m.lab_preset_uv_required();
  }

  function handlePresetChange(value: string | string[]) {
    if (Array.isArray(value)) return;
    const preset = presets.find((candidate) => candidate === value);
    if (preset) onPresetChange(preset);
  }
</script>

<Card.Root class="lab-header-card">
  <Card.Header>
    <Card.Title><h2 id="lab-scenario-title">{m.lab_scenario()}</h2></Card.Title>
    <Card.Description>{m.lab_description()}</Card.Description>
    <Card.Action>
      <Badge variant={isCustom ? "secondary" : "outline"}>
        {isCustom ? m.lab_status_custom() : m.lab_status_preset()}
      </Badge>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    <Field.Group class="lab-header-fields">
      <Field.Field>
        <Field.Label>{m.lab_selected_authenticator()}</Field.Label>
        <output class="lab-authenticator-value">{deviceName(device)}</output>
      </Field.Field>
      <Field.Field data-disabled={disabled}>
        <Field.Label for="lab-preset">{m.lab_preset()}</Field.Label>
        <Select.Root type="single" value={selectValue} onValueChange={handlePresetChange}>
          <Select.Trigger id="lab-preset" class="lab-preset-trigger" {disabled}>
            {presetLabel(presetID)}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {#each presets as preset (preset)}
                <Select.Item value={preset} label={presetLabel(preset)}>
                  {presetLabel(preset)}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Field.Field>
    </Field.Group>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  :global(.lab-header-card) {
    min-width: 0;
  }

  :global(.lab-header-card [data-slot="card-title"] h2) {
    margin: 0;
    font: inherit;
  }

  :global(.lab-header-fields) {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(13rem, 1fr);
    gap: var(--space-4);
    min-width: 0;
  }

  .lab-authenticator-value {
    display: flex;
    align-items: center;
    min-width: 0;
    block-size: 2rem;
    overflow: hidden;
    padding-inline: var(--space-2);
    border: 1px solid var(--border);
    background: var(--muted);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.lab-preset-trigger) {
    width: 100%;
  }

  @container workspace (max-width: 42rem) {
    :global(.lab-header-fields) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
