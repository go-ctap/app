<script lang="ts">
  import type { Snippet } from "svelte";

  import * as Card from "$lib/components/ui/card";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    actions: Snippet;
  };

  let { actions }: Props = $props();
</script>

<Card.Root class="lab-header-card">
  <Card.Header>
    <Card.Title>{m.lab_scenario()}</Card.Title>
    <Card.Description>{m.lab_description()}</Card.Description>
    <Card.Action>{@render actions()}</Card.Action>
  </Card.Header>
</Card.Root>

<style>
  @layer blocks {
    :global(.lab-header-card [data-slot="card-header"]) {
      align-items: center;
    }

    :global(.lab-header-card [data-slot="card-action"]) {
      align-self: center;
    }
  }

  @container workspace (max-width: 42rem) {
    @layer blocks {
      :global(.lab-header-card [data-slot="card-header"]) {
        grid-template-columns: minmax(0, 1fr);
      }

      :global(.lab-header-card [data-slot="card-action"]) {
        grid-column: 1;
        grid-row: auto;
        width: 100%;
      }
    }
  }
</style>
