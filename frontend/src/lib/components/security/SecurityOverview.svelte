<script lang="ts">
  import { LockKeyhole, ShieldCheck, TriangleAlert } from "@lucide/svelte";

  import type { StatusReport } from "../../../../bindings/github.com/telesma-app/kit/model/config";

  import * as Card from "$lib/components/ui/card";

  import { m } from "../../../paraglide/messages.js";
  import type { SecurityTone } from "$lib/components/security/security-ui.js";

  type Props = {
    report: StatusReport;
  };

  type AttentionSummary = {
    label: string;
    tone: SecurityTone;
  };

  let { report }: Props = $props();

  let verificationMethods = $derived.by(() => {
    const methods: string[] = [];

    if (report.pin.configured === true) methods.push(m.security_overview_client_pin());
    if (report.uv.configured === true) methods.push(m.security_built_in_uv());

    return methods;
  });

  let verificationPolicy = $derived.by(() => {
    const alwaysUv = report.authenticatorConfig.alwaysUv;

    if (!alwaysUv.supported) return m.security_overview_policy_unsupported();
    if (alwaysUv.configured === true) return m.security_overview_policy_always();
    if (alwaysUv.configured === false) return m.security_overview_policy_request();

    return m.security_overview_policy_unknown();
  });

  let attention = $derived.by((): AttentionSummary => {
    if (report.pin.forcePINChange === true) {
      return { label: m.security_overview_pin_change_required(), tone: "warn" };
    }

    if (report.pin.retries.remaining != null && report.pin.retries.remaining <= 2) {
      return {
        label: m.security_overview_pin_retries_low({ count: report.pin.retries.remaining }),
        tone: "warn",
      };
    }

    if (report.uv.retries.remaining != null && report.uv.retries.remaining <= 2) {
      return {
        label: m.security_overview_uv_retries_low({ count: report.uv.retries.remaining }),
        tone: "warn",
      };
    }

    if (verificationMethods.length === 0) {
      return { label: m.security_overview_no_verification(), tone: "warn" };
    }

    return { label: m.security_overview_no_issues(), tone: "ok" };
  });
</script>

<Card.Root id="security-overview" aria-labelledby="security-overview-title">
  <Card.Header>
    <Card.Title>
      <h2 id="security-overview-title" class="security-card-title">{m.security_overview()}</h2>
    </Card.Title>
    <Card.Description>{m.security_overview_description()}</Card.Description>
  </Card.Header>

  <Card.Content>
    <div class="security-overview-strip">
      <section class="security-overview-item" aria-labelledby="security-overview-verification">
        <span class="security-overview-icon" aria-hidden="true">
          <ShieldCheck />
        </span>
        <div>
          <h3 id="security-overview-verification">{m.security_overview_verification()}</h3>
          <p>
            {verificationMethods.length
              ? verificationMethods.join(" + ")
              : m.security_overview_no_verification()}
          </p>
        </div>
      </section>

      <section class="security-overview-item" aria-labelledby="security-overview-policy">
        <span class="security-overview-icon" aria-hidden="true">
          <LockKeyhole />
        </span>
        <div>
          <h3 id="security-overview-policy">{m.security_overview_verification_policy()}</h3>
          <p>{verificationPolicy}</p>
        </div>
      </section>

      <section
        class="security-overview-item"
        data-tone={attention.tone}
        aria-labelledby="security-overview-attention"
      >
        <span class="security-overview-icon" aria-hidden="true">
          <TriangleAlert />
        </span>
        <div>
          <h3 id="security-overview-attention">{m.security_overview_attention()}</h3>
          <p>{attention.label}</p>
        </div>
      </section>
    </div>
  </Card.Content>
</Card.Root>

<style>
  @layer composition {
    .security-overview-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
      min-width: 0;
    }
  }

  @layer blocks {
    .security-card-title,
    .security-overview-item h3,
    .security-overview-item p {
      margin: 0;
    }

    .security-card-title {
      font: inherit;
    }

    .security-overview-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    .security-overview-icon {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border: 1px solid var(--border);
      background: var(--muted);
      color: var(--muted-foreground);
    }

    .security-overview-icon :global(svg) {
      width: 1.125rem;
      height: 1.125rem;
    }

    .security-overview-item > div {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .security-overview-item h3 {
      color: var(--muted-foreground);
      font-size: 0.72rem;
      font-weight: 500;
    }

    .security-overview-item p {
      font-size: 0.82rem;
      font-weight: 650;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    @container workspace (max-width: 42rem) {
      .security-overview-strip {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }

  @layer exceptions {
    .security-overview-item[data-tone="warn"] .security-overview-icon {
      color: var(--warning-foreground);
    }
  }
</style>
