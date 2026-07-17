<script lang="ts">
  import { DatabaseZap, TriangleAlert } from "@lucide/svelte";

  import SensitiveHexValue from "$lib/components/shared/SensitiveHexValue.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { credentialStoreStateResult } from "$lib/ctapkit-results";
  import type { CredentialStoreStateState } from "$lib/features/passkeys/state";
  import { failureMessage } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    state: CredentialStoreStateState;
    supported: boolean | null;
    disabled: boolean;
    onLoad: () => void | Promise<boolean>;
  };

  let { state, supported, disabled, onLoad }: Props = $props();
  let loading = $derived(state.phase === "loading");
  let result = $derived(credentialStoreStateResult(state.responseEnvelope));
  let error = $derived(failureMessage(state.runtimeError) ?? failureMessage(state.responseEnvelope?.error));
</script>

<Card.Root id="credential-store-state" aria-labelledby="credential-store-state-title">
  <Card.Header>
    <Card.Title>
      <h2 id="credential-store-state-title" class="credential-store-state-title">
        {m.credential_store_state()}
      </h2>
    </Card.Title>
    <Card.Description>{m.credential_store_state_description()}</Card.Description>
    <Card.Action>
      <Button type="button" variant="outline" disabled={disabled || supported !== true || loading} onclick={() => void onLoad()}>
        {#if loading}<Spinner data-icon="inline-start" aria-hidden="true" />{:else}<DatabaseZap data-icon="inline-start" aria-hidden="true" />{/if}
        {loading ? m.credential_store_state_loading() : m.credential_store_state_read()}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    {#if result}
      <dl class="credential-store-state-values">
        <div>
          <dt>{m.authenticator_identifier()}</dt>
          <dd>
            {#key result.authenticatorIdentifierHex}
              <SensitiveHexValue value={result.authenticatorIdentifierHex} label={m.authenticator_identifier()} />
            {/key}
          </dd>
        </div>
        <div>
          <dt>{m.credential_store_state()}</dt>
          <dd>
            {#key result.credentialStoreStateHex}
              <SensitiveHexValue value={result.credentialStoreStateHex} label={m.credential_store_state()} />
            {/key}
          </dd>
        </div>
      </dl>
    {:else if supported === false || state.phase === "unsupported"}
      <Alert.Root>
        <DatabaseZap aria-hidden="true" />
        <Alert.Title>{m.status_unsupported()}</Alert.Title>
        <Alert.Description>{m.credential_store_state_unsupported()}</Alert.Description>
      </Alert.Root>
    {:else if state.phase === "error"}
      <Alert.Root variant="destructive" role="alert">
        <TriangleAlert aria-hidden="true" />
        <Alert.Title>{m.credential_store_state_failed()}</Alert.Title>
        <Alert.Description>{error ?? m.operation_failed()}</Alert.Description>
      </Alert.Root>
    {:else}
      <p class="credential-store-state-empty">{m.credential_store_state_empty()}</p>
    {/if}
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  .credential-store-state-title,
  .credential-store-state-values,
  .credential-store-state-values dt,
  .credential-store-state-values dd,
  .credential-store-state-empty {
    margin: 0;
  }

  .credential-store-state-title {
    font: inherit;
  }

  .credential-store-state-values {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
  }

  .credential-store-state-values > div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .credential-store-state-values dt,
  .credential-store-state-empty {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  @media (max-width: 42rem) {
    .credential-store-state-values {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
