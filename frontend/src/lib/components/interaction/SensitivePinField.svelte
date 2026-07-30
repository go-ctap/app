<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";

  type Props = {
    id?: string;
    label: string;
    name?: string;
    value: string;
    disabled?: boolean;
    autofocus?: boolean;
  };

  let {
    id = "authenticator-pin",
    label,
    name = "authenticator-pin",
    value = $bindable(""),
    disabled = false,
    autofocus = false,
  }: Props = $props();
</script>

<Field.Field data-disabled={disabled ? "true" : undefined}>
  <Field.Label for={id}>{label}</Field.Label>
  <Input
    bind:value
    {id}
    {name}
    type="password"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    {disabled}
    {autofocus}
  />
</Field.Field>
