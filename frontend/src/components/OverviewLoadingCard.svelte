<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { m } from "../paraglide/messages.js";

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
            <Table.Cell class="text-muted-foreground">{label}</Table.Cell>
            <Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
