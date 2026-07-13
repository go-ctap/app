<script lang="ts">
  import { FlaskConical } from "@lucide/svelte";

  import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { LabPresetID } from "$lib/features/lab/state";
  import { labelDevice } from "$lib/format";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    device: DeviceReport;
    presetID: LabPresetID;
    isCustom: boolean;
    disabled?: boolean;
    onPresetChange: (presetID: LabPresetID) => void;
  };

  let { device, presetID, isCustom, disabled = false, onPresetChange }: Props = $props();

  const presets: LabPresetID[] = [
    "minimal",
    "discoverable",
    "non-discoverable",
    "uv-required",
  ];

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

<Card.Root class="lab-header-card" data-scenario={isCustom ? "custom" : "preset"}>
  <Card.Header>
    <div class="lab-header-identity">
      <span class="lab-header-icon"><FlaskConical aria-hidden="true" /></span>
      <div>
        <Card.Title><h2 id="lab-title">{m.lab_title()}</h2></Card.Title>
        <Card.Description>{m.lab_description()}</Card.Description>
      </div>
    </div>
  </Card.Header>

  <Card.Content>
    <Field.Group class="lab-header-fields">
      <Field.Field>
        <Field.Label>{m.lab_selected_authenticator()}</Field.Label>
        <output class="lab-authenticator-value">{labelDevice(device)}</output>
      </Field.Field>
      <Field.Field data-disabled={disabled}>
        <Field.Label for="lab-preset">{m.lab_preset()}</Field.Label>
        <Select.Root type="single" value={presetID} onValueChange={handlePresetChange}>
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

  <Card.Footer class="lab-header-footer">
    <span>{m.lab_scenario_status()}</span>
    <Badge variant={isCustom ? "secondary" : "outline"}>
      {isCustom ? m.lab_status_custom() : m.lab_status_preset()}
    </Badge>
  </Card.Footer>
</Card.Root>

<style>
@layer blocks {
  :global(.lab-header-card) {
    min-width: 0;
  }

  .lab-header-identity {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .lab-header-icon {
    display: grid;
    place-items: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    border: 1px solid var(--border);
    background: var(--muted);
    color: var(--muted-foreground);
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
    min-width: 0;
    min-height: 2rem;
    overflow: hidden;
    padding: var(--space-2);
    border: 1px solid var(--border);
    background: var(--muted);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.lab-preset-trigger) {
    width: 100%;
  }

  :global(.lab-header-footer) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-block: var(--space-2);
    border-top: 1px solid var(--border);
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  @container workspace (max-width: 42rem) {
    :global(.lab-header-fields) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

@layer exceptions {
  :global(.lab-header-card[data-scenario="custom"]) .lab-header-icon {
    color: var(--foreground);
  }
}
</style>
