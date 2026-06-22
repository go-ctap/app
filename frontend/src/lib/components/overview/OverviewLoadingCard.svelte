<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { m } from "../../../paraglide/messages.js";

  let { rows = [] }: { rows?: string[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{m.inspection_in_progress()}</Card.Title>
    <Card.Description>{m.reading_authenticator_metadata()}</Card.Description>
  </Card.Header>
  <Card.Content>
    <Table.Root>
      <Table.Body>
        {#each rows as label (label)}
          <Table.Row>
            <Table.Cell class="loading-label">{label}</Table.Cell>
            <Table.Cell><Skeleton class="loading-skeleton" /></Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  :global(.loading-label) {
    color: var(--muted-foreground);
  }

  :global(.loading-skeleton) {
    width: 8rem;
    height: 1rem;
  }
}
</style>
