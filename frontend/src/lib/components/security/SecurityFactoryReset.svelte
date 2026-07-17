<script lang="ts">
  import { Hand, RotateCcw, TriangleAlert } from "@lucide/svelte";

  import type {
    AuthenticatorConfigStatus,
    ResetHints,
  } from "../../../../bindings/github.com/go-ctap/kit/model/config";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";

  import { m } from "../../../paraglide/messages.js";
  import { stateLabel } from "./security-ui.js";

  let {
    resetHints,
    authenticatorConfig,
    disabled,
    onEnableLongTouch,
    onReset,
  }: {
    resetHints: ResetHints;
    authenticatorConfig: AuthenticatorConfigStatus;
    disabled: boolean;
    onEnableLongTouch: () => void | Promise<boolean>;
    onReset: () => void | Promise<boolean>;
  } = $props();

  let longTouch = $derived(authenticatorConfig.longTouchForReset);
  let longTouchCanBeEnabled = $derived(longTouch.supported && longTouch.configured === false);
</script>

<Card.Root id="security-factory-reset" aria-labelledby="security-factory-reset-title" data-state="destructive">
  <Card.Header>
    <Card.Title>
      <h2 id="security-factory-reset-title" class="security-card-title">{m.security_factory_reset()}</h2>
    </Card.Title>
    <Card.Description>{m.security_factory_reset_description()}</Card.Description>
  </Card.Header>
  <Card.Content class="reset-content">
    <Alert.Root variant="warning">
      <TriangleAlert aria-hidden="true" />
      <Alert.Title>{m.security_warning_reset_destructive()}</Alert.Title>
      <Alert.Description>{m.security_warning_reset_credentials()}</Alert.Description>
    </Alert.Root>

    <dl class="reset-hints">
      <div><dt>{m.security_long_touch_for_reset()}</dt><dd>{stateLabel(resetHints.longTouchForReset)}</dd></div>
      <div><dt>{m.security_transports_for_reset()}</dt><dd>{resetHints.transportsForReset?.join(", ") || m.not_reported()}</dd></div>
    </dl>
  </Card.Content>
  <Card.Footer>
    <Button
      variant="outline"
      type="button"
      disabled={disabled || !longTouchCanBeEnabled}
      onclick={() => void onEnableLongTouch()}
    >
      <Hand data-icon="inline-start" aria-hidden="true" />
      {longTouch.configured ? m.security_long_touch_enabled() : m.security_long_touch_enable()}
    </Button>
    <Button variant="destructive" type="button" disabled={disabled} onclick={() => void onReset()}>
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

  .reset-hints > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: var(--space-2);
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }

  .reset-hints dt {
    color: var(--muted-foreground);
  }

  .reset-hints dd {
    font-weight: 650;
    text-align: end;
  }

  :global(#security-factory-reset [data-slot="card-footer"]) {
    justify-content: space-between;
  }
}
</style>
