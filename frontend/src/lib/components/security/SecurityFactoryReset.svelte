<script lang="ts">
  import { RotateCcw, TriangleAlert } from "@lucide/svelte";

  import type { ResetHints } from "../../../../bindings/github.com/telesma-app/kit/model/config";

  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";

  import { m } from "../../../paraglide/messages.js";
  let {
    resetHints,
    disabled,
    onReset,
  }: {
    resetHints: ResetHints;
    disabled: boolean;
    onReset: () => void | Promise<boolean>;
  } = $props();
</script>

<Card.Root
  id="security-factory-reset"
  aria-labelledby="security-factory-reset-title"
  data-state="destructive"
>
  <Card.Header>
    <Card.Title>
      <h2 id="security-factory-reset-title" class="security-card-title">
        {m.security_factory_reset()}
      </h2>
    </Card.Title>
    <Card.Description>{m.security_factory_reset_description()}</Card.Description>
  </Card.Header>

  <Card.Content class="reset-content">
    <Alert.Root variant="warning">
      <TriangleAlert aria-hidden="true" />
      <Alert.Title>{m.security_warning_reset_destructive()}</Alert.Title>
      <Alert.Description>{m.security_warning_reset_credentials()}</Alert.Description>
    </Alert.Root>
  </Card.Content>

  <Card.Footer>
    <dl class="reset-hints">
      <div>
        <dt>{m.security_transports_for_reset()}</dt>
        <dd>{resetHints.transportsForReset?.join(", ") || m.not_reported()}</dd>
      </div>
    </dl>
    <Button variant="destructive" type="button" {disabled} onclick={() => void onReset()}>
      <RotateCcw data-icon="inline-start" aria-hidden="true" />
      {m.preview_change()}
    </Button>
  </Card.Footer>
</Card.Root>

<style>
  @layer blocks {
    .security-card-title,
    .reset-hints,
    .reset-hints dt,
    .reset-hints dd {
      margin: 0;
    }

    .security-card-title {
      font: inherit;
    }

    :global(.reset-content),
    .reset-hints {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .reset-hints {
      flex: 1 1 auto;
    }

    .reset-hints > div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
      gap: var(--space-2);
    }

    .reset-hints dt {
      color: var(--muted-foreground);
    }

    .reset-hints dd {
      font-weight: 650;
      text-align: end;
    }

    :global(#security-factory-reset [data-slot="card-footer"]) {
      gap: var(--space-4);
      justify-content: space-between;
      border-top: 0;
    }
  }
</style>
