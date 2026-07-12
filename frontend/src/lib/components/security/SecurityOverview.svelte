<script lang="ts">
  import { KeyRound, Settings2, ShieldCheck } from "@lucide/svelte";

  import type { StatusReport } from "../../../../bindings/github.com/go-ctap/kit/model/config";

  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";

  import { m } from "../../../paraglide/messages.js";
  import { booleanState, reportedNumber, retryValue, stateLabel, stateTone } from "./security-ui.js";

  let { report }: { report: StatusReport } = $props();

  let resetTransports = $derived(report.resetHints.transportsForReset?.join(", ") || m.not_reported());
</script>

<Card.Root id="security-overview" aria-labelledby="security-overview-title">
  <Card.Header>
    <Card.Title><h2 id="security-overview-title" class="security-card-title">{m.security_overview()}</h2></Card.Title>
    <Card.Description>{m.security_overview_description()}</Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="security-summary-grid">
      <article class="security-summary" data-capability="pin">
        <header>
          <KeyRound aria-hidden="true" />
          <h3>{m.pin()}</h3>
          <StatusBadge label={stateLabel(report.pin.state)} tone={stateTone(report.pin.state)} />
        </header>
        <dl>
          <div><dt>{m.security_pin_protocol()}</dt><dd>{report.pin.protocolSupported ? m.status_supported() : m.status_unsupported()}</dd></div>
          <div><dt>{m.security_pin_retries()}</dt><dd>{retryValue(report.pin.retries)}</dd></div>
          <div><dt>{m.security_minimum_pin_length()}</dt><dd>{reportedNumber(report.pin.minPINLength)}</dd></div>
          <div><dt>{m.security_maximum_pin_length()}</dt><dd>{reportedNumber(report.pin.maxPINLength)}</dd></div>
        </dl>
      </article>

      <article class="security-summary" data-capability="uv">
        <header>
          <ShieldCheck aria-hidden="true" />
          <h3>{m.user_verification()}</h3>
        </header>
        <dl>
          <div><dt>{m.security_built_in_uv()}</dt><dd>{stateLabel(report.uv.state)}</dd></div>
          <div><dt>{m.security_uv_retries()}</dt><dd>{retryValue(report.uv.retries)}</dd></div>
          <div><dt>{m.security_power_cycle_required()}</dt><dd>{booleanState(report.uv.retries.powerCycleState)}</dd></div>
          <div><dt>{m.biometrics()}</dt><dd>{stateLabel(report.bio.state)}</dd></div>
          <div><dt>{m.security_bio_modality()}</dt><dd>{report.bio.uvModalityLabel || m.not_reported()}</dd></div>
        </dl>
        {#if report.uv.previewOnly || report.bio.previewOnly}
          <Badge variant="secondary">{m.preview_only()}</Badge>
        {/if}
      </article>

      <article class="security-summary" data-capability="config">
        <header>
          <Settings2 aria-hidden="true" />
          <h3>{m.security_authenticator_config()}</h3>
          <StatusBadge
            label={stateLabel(report.authenticatorConfig.state)}
            tone={stateTone(report.authenticatorConfig.state)}
          />
        </header>
        <dl>
          <div><dt>{m.security_always_uv()}</dt><dd>{booleanState(report.authenticatorConfig.alwaysUv.configured)}</dd></div>
          <div><dt>{m.security_long_touch_for_reset()}</dt><dd>{stateLabel(report.resetHints.longTouchForReset)}</dd></div>
          <div><dt>{m.security_transports_for_reset()}</dt><dd>{resetTransports}</dd></div>
          <div><dt>{m.security_max_rp_ids()}</dt><dd>{reportedNumber(report.limits.maxRPIDsForSetMinPINLength)}</dd></div>
          <div><dt>{m.security_preferred_platform_uv_attempts()}</dt><dd>{reportedNumber(report.limits.preferredPlatformUvAttempts)}</dd></div>
        </dl>
        {#if report.authenticatorConfig.previewOnly}
          <Badge variant="secondary">{m.preview_only()}</Badge>
        {/if}
      </article>
    </div>
  </Card.Content>
</Card.Root>

<style>
@layer composition {
  .security-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
  }
}

@layer blocks {
  .security-summary {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .security-summary header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .security-summary h3,
  .security-card-title,
  .security-summary dl,
  .security-summary dt,
  .security-summary dd {
    margin: 0;
  }

  .security-summary h3 {
    min-width: 0;
    font-size: 0.9rem;
  }

  .security-card-title {
    font: inherit;
  }

  .security-summary dl {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .security-summary dl > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: var(--space-2);
    min-width: 0;
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }

  .security-summary dt {
    min-width: 0;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    overflow-wrap: anywhere;
  }

  .security-summary dd {
    min-width: 0;
    font-size: 0.8rem;
    font-weight: 650;
    text-align: end;
    overflow-wrap: anywhere;
  }

  @container workspace (max-width: 58rem) {
    .security-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @container workspace (max-width: 38rem) {
    .security-summary-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

@layer exceptions {
  .security-summary[data-capability="uv"] header {
    grid-template-columns: auto minmax(0, 1fr);
  }
}
</style>
