<script lang="ts">
  import {
    CircleCheck,
    CircleDashed,
    CircleX,
    RefreshCw,
    ShieldCheck,
    TriangleAlert,
  } from "@lucide/svelte";

  import {
    AttestationTrustStatus,
    type AttestationTrustAssessment,
    type AttestationTrustStatus as AttestationTrustStatusValue,
  } from "../../../../bindings/github.com/go-ctap/mds/model";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import type { LabVerificationState } from "$lib/features/lab/state";
  import { failureMessage } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    state: LabVerificationState<AttestationTrustAssessment>;
    onRetry: () => void;
  };

  let { state: trustState, onRetry }: Props = $props();
  let assessment = $derived(
    trustState.phase === "ready" ? trustState.verification : null,
  );

  function statusLabel(status: AttestationTrustStatusValue) {
    if (status === AttestationTrustStatus.AttestationTrustStatusTrusted) {
      return m.lab_attestation_trust_trusted();
    }
    if (status === AttestationTrustStatus.AttestationTrustStatusUntrusted) {
      return m.lab_attestation_trust_untrusted();
    }
    if (status === AttestationTrustStatus.AttestationTrustStatusNotApplicable) {
      return m.lab_attestation_trust_not_applicable();
    }
    return m.lab_verification_unavailable();
  }

  function statusVariant(status: AttestationTrustStatusValue): BadgeVariant {
    if (status === AttestationTrustStatus.AttestationTrustStatusUntrusted) {
      return "destructive";
    }
    if (status === AttestationTrustStatus.AttestationTrustStatusTrusted) {
      return "secondary";
    }
    return "outline";
  }

  function statusTone(status: AttestationTrustStatusValue): "ok" | "bad" | "neutral" {
    if (status === AttestationTrustStatus.AttestationTrustStatusTrusted) return "ok";
    if (status === AttestationTrustStatus.AttestationTrustStatusUntrusted) return "bad";
    return "neutral";
  }

  function chainLabel(value: boolean | null | undefined, status: AttestationTrustStatusValue) {
    if (value === true) return m.lab_attestation_trust_trusted();
    if (value === false) return m.lab_attestation_trust_untrusted();
    if (status === AttestationTrustStatus.AttestationTrustStatusNotApplicable) {
      return m.lab_attestation_trust_not_applicable();
    }
    return m.lab_verification_not_checked();
  }
</script>

{#snippet statusIcon(status: "ok" | "bad" | "neutral")}
  {#if status === "ok"}
    <CircleCheck aria-hidden="true" />
  {:else if status === "bad"}
    <CircleX aria-hidden="true" />
  {:else}
    <CircleDashed aria-hidden="true" />
  {/if}
{/snippet}

{#snippet fact(label: string, value: string, status: "ok" | "bad" | "neutral")}
  <div class="lab-attestation-trust-fact" data-status={status}>
    <dt>{label}</dt>
    <dd>
      {@render statusIcon(status)}
      {value}
    </dd>
  </div>
{/snippet}

<section class="lab-attestation-trust" aria-labelledby="lab-attestation-trust-title">
  <header class="lab-attestation-trust-header">
    <div>
      <h3 id="lab-attestation-trust-title">
        <ShieldCheck aria-hidden="true" />
        {m.lab_attestation_trust_title()}
      </h3>
      <p>{m.lab_attestation_trust_description()}</p>
    </div>
    {#if assessment}
      <Badge variant={statusVariant(assessment.status)}>
        {@render statusIcon(statusTone(assessment.status))}
        {statusLabel(assessment.status)}
      </Badge>
    {/if}
  </header>

  {#if trustState.phase === "loading"}
    <div class="lab-attestation-trust-loading">
      <Spinner aria-hidden="true" />
      <span>{m.lab_attestation_trust_loading()}</span>
    </div>
  {:else if trustState.phase === "error"}
    <Alert.Root variant="destructive" role="alert">
      <TriangleAlert />
      <Alert.Title>{m.lab_attestation_trust_error()}</Alert.Title>
      <Alert.Description>
        <p>{failureMessage(trustState.error) ?? m.lab_attestation_trust_error()}</p>
        <Button type="button" size="sm" variant="outline" onclick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {m.lab_attestation_trust_retry()}
        </Button>
      </Alert.Description>
    </Alert.Root>
  {:else if assessment}
    <dl class="lab-attestation-trust-matrix">
      {@render fact(
        m.lab_attestation_trust_metadata(),
        assessment.metadataFound
          ? m.lab_attestation_trust_found()
          : m.lab_attestation_trust_not_found(),
        assessment.metadataFound ? "ok" : "neutral",
      )}
      {@render fact(
        m.lab_attestation_trust_chain(),
        chainLabel(assessment.certificateChainTrusted, assessment.status),
        assessment.certificateChainTrusted === true
          ? "ok"
          : assessment.certificateChainTrusted === false ? "bad" : "neutral",
      )}
    </dl>

    <div class="lab-attestation-trust-details">
      <span>{m.lab_attestation_trust_statuses()}</span>
      <div>
        {#if assessment.authenticatorStatuses?.length}
          {#each assessment.authenticatorStatuses as status (status)}
            <Badge variant="outline"><code>{status}</code></Badge>
          {/each}
        {:else}
          <span>{m.lab_verification_no_findings()}</span>
        {/if}
      </div>
    </div>

    <div class="lab-attestation-trust-details" data-tone="issue">
      <span>{m.lab_verification_issues()}</span>
      {#if assessment.issues?.length}
        <ul>
          {#each assessment.issues as issue (issue)}
            <li><code>{issue}</code></li>
          {/each}
        </ul>
      {:else}
        <span>{m.lab_verification_no_findings()}</span>
      {/if}
    </div>
  {/if}
</section>

<style>
@layer compositions {
  .lab-attestation-trust-matrix {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-5);
  }
}

@layer blocks {
  .lab-attestation-trust {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    padding-block: var(--space-2);
  }

  .lab-attestation-trust-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .lab-attestation-trust-header > div,
  .lab-attestation-trust-header h3,
  .lab-attestation-trust-header p {
    margin: 0;
  }

  .lab-attestation-trust-header > div {
    display: grid;
    gap: var(--space-1);
  }

  .lab-attestation-trust-header h3 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.9rem;
  }

  .lab-attestation-trust-header h3 :global(svg),
  .lab-attestation-trust-fact dd :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .lab-attestation-trust-header p {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .lab-attestation-trust-loading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 3rem;
    color: var(--muted-foreground);
    font-size: 0.78rem;
  }

  .lab-attestation-trust-fact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-width: 0;
    padding-block: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .lab-attestation-trust-fact dt,
  .lab-attestation-trust-fact dd {
    margin: 0;
  }

  .lab-attestation-trust-fact dt,
  .lab-attestation-trust-details > span {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .lab-attestation-trust-fact dd {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.75rem;
    font-weight: 500;
    text-align: end;
  }

  .lab-attestation-trust-details {
    display: grid;
    grid-template-columns: minmax(9rem, auto) minmax(0, 1fr);
    gap: var(--space-3);
    align-items: start;
    font-size: 0.72rem;
  }

  .lab-attestation-trust-details > div,
  .lab-attestation-trust-details ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lab-attestation-trust-details code {
    overflow-wrap: anywhere;
  }

  :global(.lab-attestation-trust [data-slot="alert-description"]) {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
  }

  :global(.lab-attestation-trust [data-slot="alert-description"] p) {
    margin: 0;
  }

  @container workspace (max-width: 42rem) {
    .lab-attestation-trust-matrix,
    .lab-attestation-trust-details {
      grid-template-columns: minmax(0, 1fr);
    }

    .lab-attestation-trust-details {
      gap: var(--space-1);
    }
  }
}

@layer exceptions {
  .lab-attestation-trust-fact[data-status="bad"] dd,
  .lab-attestation-trust-details[data-tone="issue"] code {
    color: var(--destructive);
  }

  .lab-attestation-trust-fact[data-status="neutral"] dd {
    color: var(--muted-foreground);
  }
}
</style>
