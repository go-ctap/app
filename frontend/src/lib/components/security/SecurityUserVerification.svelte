<script lang="ts">
  import { ShieldCheck } from "@lucide/svelte";

  import {
    AlwaysUVTarget,
    type AuthenticatorConfigStatus,
    type PINStatus,
    type UVStatus,
  } from "../../../../bindings/github.com/go-ctap/kit/model/config";

  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";

  import { m } from "../../../paraglide/messages.js";
  import { booleanState, retryValue, stateLabel, stateTone } from "./security-ui.js";

  type Props = {
    pin: PINStatus;
    uv: UVStatus;
    authenticatorConfig: AuthenticatorConfigStatus;
    disabled: boolean;
    onAlwaysUVChange: (target: AlwaysUVTarget) => void | Promise<boolean>;
  };

  let { pin, uv, authenticatorConfig, disabled, onAlwaysUVChange }: Props = $props();

  let alwaysUV = $derived(authenticatorConfig.alwaysUv);
  let alwaysUVKnown = $derived(alwaysUV.configured != null);
  let alwaysUVDisabled = $derived(
    disabled || !authenticatorConfig.supported || !alwaysUV.supported || !alwaysUVKnown,
  );
  let alwaysUVStatusLabel = $derived(
    alwaysUV.supported ? booleanState(alwaysUV.configured) : m.status_unsupported(),
  );

  function handleAlwaysUVChange(checked: boolean) {
    if (alwaysUVDisabled || checked === alwaysUV.configured) return;
    void onAlwaysUVChange(
      checked ? AlwaysUVTarget.AlwaysUVTargetEnable : AlwaysUVTarget.AlwaysUVTargetDisable,
    );
  }
</script>

<Card.Root id="security-user-verification" aria-labelledby="security-user-verification-title">
  <Card.Header>
    <Card.Title>
      <h2 id="security-user-verification-title" class="security-card-title">{m.user_verification()}</h2>
    </Card.Title>
    <Card.Description>{m.security_user_verification_description()}</Card.Description>
  </Card.Header>
  <Card.Content class="security-uv-content">
    <section class="built-in-uv" aria-labelledby="security-built-in-uv-title">
      <header class="verification-section-heading">
        <div>
          <h3 id="security-built-in-uv-title">{m.security_built_in_uv()}</h3>
          <p>{m.security_built_in_uv_description()}</p>
        </div>
        <StatusBadge label={stateLabel(uv.state)} tone={stateTone(uv.state)} />
      </header>

      {#if uv.supported}
        <dl class="uv-facts">
          <div><dt>{m.security_uv_retries()}</dt><dd>{retryValue(uv.retries)}</dd></div>
          {#if uv.previewOnly}
            <div><dt>{m.support_mode()}</dt><dd><Badge variant="secondary">{m.preview_only()}</Badge></dd></div>
          {/if}
        </dl>
      {/if}
    </section>

    <section id="security-always-uv" class="always-uv" aria-labelledby="security-always-uv-title">
      <Field.Field orientation="horizontal" data-disabled={alwaysUVDisabled ? "true" : undefined}>
        <Field.Content>
          <div class="always-uv-heading">
            <h3 id="security-always-uv-title">{m.security_always_uv()}</h3>
            <StatusBadge
              label={alwaysUVStatusLabel}
              tone={alwaysUV.configured === true ? "ok" : "neutral"}
            />
          </div>
          <Field.Description id="security-always-uv-description">
            {m.security_always_uv_description()}
          </Field.Description>
        </Field.Content>
        <Switch
          id="security-always-uv-switch"
          checked={alwaysUV.configured === true}
          disabled={alwaysUVDisabled}
          aria-labelledby="security-always-uv-title"
          aria-describedby="security-always-uv-description"
          onCheckedChange={handleAlwaysUVChange}
        />
      </Field.Field>

      <dl class="verification-methods">
        <div>
          <dt>{m.security_always_uv_methods()}</dt>
          <dd>
            {#if pin.supported}
              <Badge variant="outline">{m.security_client_pin()}: {stateLabel(pin.state)}</Badge>
            {/if}
            {#if uv.supported}
              <Badge variant="outline">{m.security_built_in_uv()}: {stateLabel(uv.state)}</Badge>
            {/if}
            {#if !pin.supported && !uv.supported}
              <Badge variant="secondary">{m.security_no_verification_methods()}</Badge>
            {/if}
          </dd>
        </div>
      </dl>

      {#if !alwaysUV.supported}
        <Alert.Root>
          <ShieldCheck aria-hidden="true" />
          <Alert.Title>{m.status_unsupported()}</Alert.Title>
          <Alert.Description>{m.security_always_uv_not_reported()}</Alert.Description>
        </Alert.Root>
      {:else if !authenticatorConfig.supported}
        <Alert.Root variant="warning">
          <ShieldCheck aria-hidden="true" />
          <Alert.Title>{m.status_unsupported()}</Alert.Title>
          <Alert.Description>{m.security_always_uv_config_unavailable()}</Alert.Description>
        </Alert.Root>
      {:else if !alwaysUVKnown}
        <Alert.Root variant="warning">
          <ShieldCheck aria-hidden="true" />
          <Alert.Title>{m.state_unknown()}</Alert.Title>
          <Alert.Description>{m.security_always_uv_unknown()}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if alwaysUV.previewOnly}
        <p class="preview-note" data-state="preview-only">
          <Badge variant="secondary">{m.preview_only()}</Badge>
          {m.security_preview_only_description()}
        </p>
      {/if}
    </section>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  .security-card-title,
  .uv-facts,
  .uv-facts dt,
  .uv-facts dd,
  .verification-methods,
  .verification-methods dt,
  .verification-methods dd,
  .verification-section-heading h3,
  .verification-section-heading p,
  .always-uv-heading h3,
  .preview-note {
    margin: 0;
  }

  .security-card-title {
    font: inherit;
  }

  :global(.security-uv-content),
  .built-in-uv,
  .always-uv,
  .uv-facts,
  .verification-methods {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .verification-section-heading,
  .always-uv-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-3);
    min-width: 0;
  }

  .verification-section-heading > div {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .verification-section-heading h3,
  .always-uv-heading h3 {
    font-size: 0.82rem;
    font-weight: 650;
  }

  .verification-section-heading p {
    color: var(--muted-foreground);
    font-size: 0.75rem;
    line-height: 1.45;
  }

  .uv-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .uv-facts > div {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
    border: 1px solid var(--border);
    padding: var(--space-2);
  }

  .uv-facts dt {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .uv-facts dd {
    font-weight: 650;
  }

  .always-uv {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .verification-methods > div {
    display: grid;
    grid-template-columns: minmax(9rem, 0.4fr) minmax(0, 1fr);
    align-items: start;
    gap: var(--space-2);
    min-width: 0;
  }

  .verification-methods dt {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .verification-methods dd {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
    min-width: 0;
  }

  .preview-note {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--muted-foreground);
    font-size: 0.78rem;
  }

  @container workspace (max-width: 40rem) {
    .uv-facts,
    .verification-methods > div {
      grid-template-columns: minmax(0, 1fr);
    }

    .verification-methods dd {
      justify-content: flex-start;
    }
  }
}
</style>
