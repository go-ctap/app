<script lang="ts">
  import { Building2, Hand, SlidersHorizontal, Tags } from "@lucide/svelte";

  import {
    AlwaysUVTarget,
    type CapabilityState,
    type StatusReport,
  } from "../../../../bindings/github.com/telesma-app/kit/model/config";

  import SecurityPINPolicyForm from "$lib/components/security/SecurityPINPolicyForm.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Switch } from "$lib/components/ui/switch";
  import type {
    SecurityMutationValidationError,
    SecurityPINPolicyDraft,
  } from "$lib/features/security/state";

  import { m } from "../../../paraglide/messages.js";
  import { booleanState, stateLabel, stateTone } from "$lib/components/security/security-ui.js";

  type Props = {
    report: StatusReport;
    disabled: boolean;
    validationError: SecurityMutationValidationError | null;
    onEnterpriseAttestation: () => void | Promise<boolean>;
    onAlwaysUVChange: (target: AlwaysUVTarget) => void | Promise<boolean>;
    onPINPolicyChange: (draft: SecurityPINPolicyDraft) => void | Promise<boolean>;
    onPINPolicyEdit: () => void;
    onEnableLongTouch: () => void | Promise<boolean>;
  };

  let {
    report,
    disabled,
    validationError,
    onEnterpriseAttestation,
    onAlwaysUVChange,
    onPINPolicyChange,
    onPINPolicyEdit,
    onEnableLongTouch,
  }: Props = $props();

  let configuration = $derived(report.authenticatorConfig);
  let enterprise = $derived(configuration.enterpriseAttestation);
  let alwaysUV = $derived(configuration.alwaysUv);
  let pinPolicy = $derived(configuration.setMinPINLength);
  let longTouch = $derived(configuration.longTouchForReset);
  let vendorPrototype = $derived(configuration.vendorPrototype);

  let enterpriseCanBeEnabled = $derived(
    configuration.supported && enterprise.supported && enterprise.configured === false,
  );

  let alwaysUVKnown = $derived(alwaysUV.configured != null);
  let alwaysUVDisabled = $derived(
    disabled || !configuration.supported || !alwaysUV.supported || !alwaysUVKnown,
  );

  let pinPolicyDisabled = $derived(disabled || !configuration.supported || !pinPolicy.supported);

  let longTouchCanBeEnabled = $derived(
    configuration.supported && longTouch.supported && longTouch.configured === false,
  );

  function capabilityLabel(capability: CapabilityState) {
    if (!capability.supported) return m.status_unsupported();
    if (capability.configured != null) return booleanState(capability.configured);

    return stateLabel(capability.state);
  }

  function handleAlwaysUVChange(checked: boolean) {
    if (alwaysUVDisabled || checked === alwaysUV.configured) return;

    void onAlwaysUVChange(
      checked ? AlwaysUVTarget.AlwaysUVTargetEnable : AlwaysUVTarget.AlwaysUVTargetDisable,
    );
  }
</script>

<Card.Root
  id="security-authenticator-configuration"
  aria-labelledby="security-authenticator-configuration-title"
>
  <Card.Header>
    <Card.Title>
      <h2 id="security-authenticator-configuration-title" class="security-card-title">
        {m.security_authenticator_configuration()}
      </h2>
    </Card.Title>
    <Card.Description>{m.security_authenticator_configuration_description()}</Card.Description>
    <Card.Action class="configuration-status">
      <StatusBadge label={stateLabel(configuration.state)} tone={stateTone(configuration.state)} />
    </Card.Action>
  </Card.Header>

  <Card.Content class="configuration-content">
    <div class="configuration-capabilities" aria-label={m.security_configuration_capabilities()}>
      <Badge variant="outline">
        authnrCfg · {configuration.supported ? m.status_supported() : m.status_unsupported()}
      </Badge>
      <Badge variant="outline">
        uvAcfg · {capabilityLabel(configuration.uvAcfg)}
      </Badge>
      <Badge variant="outline">permission · acfg</Badge>
    </div>

    <section
      class="configuration-command"
      data-supported={enterprise.supported ? "true" : "false"}
      aria-labelledby="security-enterprise-attestation-title"
    >
      <div class="configuration-command-heading">
        <div class="configuration-command-icon"><Building2 aria-hidden="true" /></div>
        <div class="configuration-command-copy">
          <div class="configuration-command-title">
            <h3 id="security-enterprise-attestation-title">
              {m.security_enterprise_attestation()}
            </h3>
            <Badge variant="outline"><code>enableEnterpriseAttestation · 0x01</code></Badge>
          </div>
          <p>{m.security_enterprise_attestation_description()}</p>
        </div>
        <StatusBadge label={capabilityLabel(enterprise)} tone={stateTone(enterprise.state)} />
      </div>
      <div class="configuration-command-action">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !enterpriseCanBeEnabled}
          onclick={() => void onEnterpriseAttestation()}
        >
          {enterprise.configured
            ? m.security_enterprise_attestation_enabled()
            : m.security_enterprise_attestation_enable()}
        </Button>
      </div>
    </section>

    <section
      class="configuration-command"
      data-supported={alwaysUV.supported ? "true" : "false"}
      aria-labelledby="security-always-uv-title"
    >
      <Field.Field orientation="horizontal" data-disabled={alwaysUVDisabled ? "true" : undefined}>
        <Field.Content>
          <div class="configuration-command-title">
            <h3 id="security-always-uv-title">{m.security_always_uv()}</h3>
            <Badge variant="outline"><code>toggleAlwaysUv · 0x02</code></Badge>
            <StatusBadge label={capabilityLabel(alwaysUV)} tone={stateTone(alwaysUV.state)} />
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
    </section>

    <section
      class="configuration-command configuration-command-form"
      data-supported={pinPolicy.supported ? "true" : "false"}
      aria-labelledby="security-pin-policy-title"
    >
      <div class="configuration-command-heading">
        <div class="configuration-command-icon"><SlidersHorizontal aria-hidden="true" /></div>
        <div class="configuration-command-copy">
          <div class="configuration-command-title">
            <h3 id="security-pin-policy-title">{m.security_pin_policy()}</h3>
            <Badge variant="outline"><code>setMinPINLength · 0x03</code></Badge>
          </div>
          <p>{m.security_pin_policy_description()}</p>
        </div>
        <StatusBadge label={capabilityLabel(pinPolicy)} tone={stateTone(pinPolicy.state)} />
      </div>

      <SecurityPINPolicyForm
        {report}
        disabled={pinPolicyDisabled}
        {validationError}
        onChange={onPINPolicyChange}
        onEdit={onPINPolicyEdit}
      />
    </section>

    <section
      class="configuration-command"
      data-supported={longTouch.supported ? "true" : "false"}
      aria-labelledby="security-long-touch-title"
    >
      <div class="configuration-command-heading">
        <div class="configuration-command-icon"><Hand aria-hidden="true" /></div>
        <div class="configuration-command-copy">
          <div class="configuration-command-title">
            <h3 id="security-long-touch-title">{m.security_long_touch_for_reset()}</h3>
            <Badge variant="outline"><code>enableLongTouchForReset · 0x04</code></Badge>
          </div>
          <p>{m.security_long_touch_description()}</p>
        </div>
        <StatusBadge label={capabilityLabel(longTouch)} tone={stateTone(longTouch.state)} />
      </div>
      <div class="configuration-command-action">
        <Button
          variant="outline"
          type="button"
          disabled={disabled || !longTouchCanBeEnabled}
          onclick={() => void onEnableLongTouch()}
        >
          {longTouch.configured ? m.security_long_touch_enabled() : m.security_long_touch_enable()}
        </Button>
      </div>
    </section>

    <section
      class="configuration-command"
      data-supported={vendorPrototype.supported ? "true" : "false"}
      aria-labelledby="security-vendor-prototype-title"
    >
      <div class="configuration-command-heading">
        <div class="configuration-command-icon"><Tags aria-hidden="true" /></div>
        <div class="configuration-command-copy">
          <div class="configuration-command-title">
            <h3 id="security-vendor-prototype-title">{m.security_vendor_prototype()}</h3>
            <Badge variant="outline"><code>vendorPrototype · 0xFF</code></Badge>
          </div>
          <p>{m.security_vendor_prototype_description()}</p>
        </div>
        <StatusBadge
          label={capabilityLabel(vendorPrototype)}
          tone={stateTone(vendorPrototype.state)}
        />
      </div>

      {#if configuration.vendorPrototypeConfigCommands?.length}
        <dl class="vendor-command-inventory">
          <div>
            <dt>{m.security_vendor_command_ids()}</dt>
            <dd>
              {#each configuration.vendorPrototypeConfigCommands as command (command)}
                <Badge variant="secondary"><code>{command}</code></Badge>
              {/each}
            </dd>
          </div>
        </dl>
      {:else}
        <p class="vendor-command-empty">{m.security_vendor_commands_not_reported()}</p>
      {/if}
    </section>
  </Card.Content>
</Card.Root>

<style>
  @layer composition {
    .configuration-capabilities,
    .configuration-command-title,
    .vendor-command-inventory dd {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
  }

  @layer blocks {
    .security-card-title,
    .configuration-command h3,
    .configuration-command p,
    .vendor-command-inventory,
    .vendor-command-inventory dt,
    .vendor-command-inventory dd {
      margin: 0;
    }

    .security-card-title {
      font: inherit;
    }

    :global(.configuration-status) {
      align-self: start;
    }

    :global(.configuration-content) {
      display: grid;
      gap: 0;
      min-width: 0;
    }

    .configuration-capabilities {
      padding-bottom: var(--space-3);
    }

    .configuration-command {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
      border-top: 1px solid var(--border);
      padding-block: var(--space-4);
    }

    .configuration-command:last-child {
      padding-bottom: 0;
    }

    .configuration-command-heading {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-3);
      min-width: 0;
    }

    .configuration-command-icon {
      display: grid;
      width: 2rem;
      aspect-ratio: 1;
      place-items: center;
      border: 1px solid var(--border);
      background: var(--muted);
      color: var(--muted-foreground);
    }

    .configuration-command-icon :global(svg) {
      width: 1rem;
      height: 1rem;
    }

    .configuration-command-copy {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .configuration-command h3 {
      font-size: 0.86rem;
      font-weight: 650;
    }

    .configuration-command p,
    .vendor-command-inventory dt,
    .vendor-command-empty {
      color: var(--muted-foreground);
      font-size: 0.75rem;
      line-height: 1.45;
    }

    .configuration-command-action {
      display: flex;
      justify-content: flex-end;
    }

    .vendor-command-inventory > div {
      display: grid;
      grid-template-columns: minmax(9rem, 0.4fr) minmax(0, 1fr);
      gap: var(--space-2);
      min-width: 0;
    }

    .vendor-command-inventory dd {
      justify-content: flex-end;
      min-width: 0;
    }

    @container workspace (max-width: 42rem) {
      .configuration-command-heading {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .configuration-command-heading > :global([data-slot="badge"]) {
        grid-column: 2;
        justify-self: start;
      }

      .vendor-command-inventory > div {
        grid-template-columns: minmax(0, 1fr);
      }

      .vendor-command-inventory dd {
        justify-content: flex-start;
      }
    }
  }

  @layer exceptions {
    .configuration-command[data-supported="false"] {
      color: var(--muted-foreground);
      opacity: 0.68;
    }

    .configuration-command[data-supported="false"] .configuration-command-icon {
      background: transparent;
    }
  }
</style>
