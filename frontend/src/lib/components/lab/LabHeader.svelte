<script lang="ts">
  import { Sparkles } from "@lucide/svelte";

  import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { deviceName } from "$lib/format";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    device: DeviceReport;
    disabled?: boolean;
    onFillDemoValues: () => void;
  };

  let {
    device,
    disabled = false,
    onFillDemoValues,
  }: Props = $props();
</script>

<Card.Root class="lab-header-card">
  <Card.Header>
    <Card.Title><h2 id="lab-scenario-title">{m.lab_scenario()}</h2></Card.Title>
    <Card.Description>{m.lab_description()}</Card.Description>
    <Card.Action>
      <Button variant="outline" size="sm" {disabled} onclick={onFillDemoValues}>
        <Sparkles aria-hidden="true" />
        {m.lab_fill_demo_values()}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    <Field.Group class="lab-header-fields">
      <Field.Field>
        <Field.Label>{m.lab_selected_authenticator()}</Field.Label>
        <output class="lab-authenticator-value">{deviceName(device)}</output>
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

}
</style>
