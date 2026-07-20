<script lang="ts">
  import * as ExpandableDataTable from "./index.js";

  type Props = {
    open: boolean;
    disabled?: boolean;
    onOpenChange: (open: boolean) => void;
  };

  let {
    open,
    disabled = false,
    onOpenChange,
  }: Props = $props();
</script>

{#snippet header()}
  <th scope="col">Credential</th>
  <th scope="col">State</th>
{/snippet}

<ExpandableDataTable.Root aria-label="Credentials" {header}>
  <ExpandableDataTable.Row
    detailsId="credential-details"
    {open}
    {disabled}
    columnCount={2}
    {onOpenChange}
  >
    {#snippet summary(triggerProps)}
      <td>
        <button type="button" aria-label="Toggle credential" {...triggerProps}>
          Example credential
        </button>
      </td>
      <td>Ready</td>
    {/snippet}
    {#snippet details()}
      <p>Credential details</p>
    {/snippet}
  </ExpandableDataTable.Row>
</ExpandableDataTable.Root>
