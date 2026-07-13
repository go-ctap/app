<script lang="ts">
  import { AuthenticatorTransport } from "../../../../bindings/github.com/go-ctap/ctap/credential";

  import * as Field from "$lib/components/ui/field/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import type { LabDescriptorDraft } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    descriptors: LabDescriptorDraft[];
    disabled?: boolean;
    onChange: (descriptors: LabDescriptorDraft[]) => void;
  };

  let { descriptors, disabled = false, onChange }: Props = $props();

  const transports = [
    AuthenticatorTransport.AuthenticatorTransportUSB,
    AuthenticatorTransport.AuthenticatorTransportNFC,
    AuthenticatorTransport.AuthenticatorTransportBLE,
    AuthenticatorTransport.AuthenticatorTransportSmartCard,
    AuthenticatorTransport.AuthenticatorTransportHybrid,
    AuthenticatorTransport.AuthenticatorTransportInternal,
  ];

  function compactID(value: string) {
    return value.length > 34 ? `${value.slice(0, 18)}…${value.slice(-12)}` : value;
  }

  function updateTransports(index: number, values: string | string[]) {
    const selected = (Array.isArray(values) ? values : [values]).filter((value) =>
      transports.includes(value as AuthenticatorTransport)
    ) as AuthenticatorTransport[];
    onChange(descriptors.map((descriptor, current) => (
      current === index ? { ...descriptor, transports: selected } : descriptor
    )));
  }
</script>

<Field.Set data-disabled={disabled} disabled={disabled}>
  <Field.Legend>{m.lab_descriptor_transports()}</Field.Legend>
  <Field.Group>
    {#if descriptors.length > 0}
      {#each descriptors as descriptor, index (`transport-${index}`)}
        <Field.Field data-disabled={disabled}>
          <Field.Content>
            <Field.Title><code title={descriptor.credentialIDHex}>{compactID(descriptor.credentialIDHex)}</code></Field.Title>
            <ToggleGroup.Root
              type="multiple"
              value={descriptor.transports}
              variant="outline"
              size="sm"
              spacing={1}
              class="lab-transport-toggles"
              aria-label={`${m.lab_descriptor_transports()} ${index + 1}`}
              {disabled}
              onValueChange={(values) => updateTransports(index, values)}
            >
              {#each transports as transport (transport)}
                <ToggleGroup.Item value={transport}>{transport}</ToggleGroup.Item>
              {/each}
            </ToggleGroup.Root>
          </Field.Content>
        </Field.Field>
      {/each}
    {/if}
  </Field.Group>
</Field.Set>

<style>
@layer blocks {
  :global(.lab-transport-toggles) {
    flex-wrap: wrap;
    width: 100%;
  }
}
</style>
