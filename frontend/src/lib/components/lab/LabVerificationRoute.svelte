<script lang="ts">
  import {
    CircleCheck,
    CircleDashed,
    CircleX,
    RefreshCw,
    ShieldCheck,
    TriangleAlert,
  } from "@lucide/svelte";

  import type {
    GetAssertionVerification,
    MakeCredentialVerification,
  } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";
  import type { AttestationTrustAssessment } from "../../../../bindings/github.com/go-ctap/mds/model";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import type { LabVerificationState } from "$lib/features/lab/state";
  import { failureMessage } from "$lib/failure";
  import {
    aggregateVerificationStatus,
    buildAssertionVerificationStages,
    buildAttestationTrustStage,
    buildMakeCredentialVerificationStages,
    buildMissingAssertionStages,
    pendingStage,
    type LabVerificationCheckTone,
    type LabVerificationStage,
    type LabVerificationStageStatus,
    verificationStatusLabel,
  } from "$lib/lab-verification-route";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mode: "make" | "get";
    state: LabVerificationState<MakeCredentialVerification | GetAssertionVerification>;
    attestationTrust?: LabVerificationState<AttestationTrustAssessment>;
    onRetryVerification: () => void;
    onRetryAttestationTrust?: () => void;
  };

  let {
    mode,
    state: verificationState,
    attestationTrust = { phase: "idle" },
    onRetryVerification,
    onRetryAttestationTrust = () => undefined,
  }: Props = $props();
  let selectedAssertionValue = $state("");

  let readyVerification = $derived(
    verificationState.phase === "ready" ? verificationState.verification : null,
  );
  let makeVerification = $derived(
    mode === "make" ? readyVerification as MakeCredentialVerification | null : null,
  );
  let getVerification = $derived(
    mode === "get" ? readyVerification as GetAssertionVerification | null : null,
  );
  let selectedAssertion = $derived(
    getVerification?.assertions.find(
      (assertion) => String(assertion.index) === selectedAssertionValue,
    ) ?? getVerification?.assertions[0],
  );

  $effect(() => {
    if (!getVerification?.assertions.length) {
      selectedAssertionValue = "";
      return;
    }
    if (!getVerification.assertions.some(
      (assertion) => String(assertion.index) === selectedAssertionValue,
    )) {
      selectedAssertionValue = String(getVerification.assertions[0].index);
    }
  });

  function unavailableStage(
    id: string,
    title: string,
    description: string,
  ): LabVerificationStage {
    return {
      ...pendingStage(id, title, description),
      status: "unavailable",
      statusLabel: verificationStatusLabel("unavailable"),
    };
  }

  function pendingMakeStages(): LabVerificationStage[] {
    const verificationLoading = verificationState.phase === "loading";
    const verificationError = verificationState.phase === "error";
    const localFirst = verificationError
      ? unavailableStage(
          "authenticator-data",
          m.lab_verification_authenticator_data(),
          m.lab_verification_authenticator_data_description(),
        )
      : pendingStage(
          "authenticator-data",
          m.lab_verification_authenticator_data(),
          m.lab_verification_authenticator_data_description(),
          verificationLoading,
        );
    const trustStage = attestationTrust.phase === "ready"
      ? buildAttestationTrustStage(attestationTrust.verification)
      : attestationTrust.phase === "error"
        ? unavailableStage(
            "attestation-trust",
            m.lab_attestation_trust_title(),
            m.lab_attestation_trust_description(),
          )
        : pendingStage(
            "attestation-trust",
            m.lab_attestation_trust_title(),
            m.lab_attestation_trust_description(),
            attestationTrust.phase === "loading",
          );

    return [
      localFirst,
      pendingStage(
        "attestation-evidence",
        m.lab_verification_attestation_evidence(),
        m.lab_verification_attestation_evidence_description(),
      ),
      trustStage,
    ];
  }

  function pendingGetStages(): LabVerificationStage[] {
    const verificationLoading = verificationState.phase === "loading";
    const first = verificationState.phase === "error"
      ? unavailableStage(
          "credential-authenticator-data",
          m.lab_verification_credential_authenticator_data(),
          m.lab_verification_credential_authenticator_data_description(),
        )
      : pendingStage(
          "credential-authenticator-data",
          m.lab_verification_credential_authenticator_data(),
          m.lab_verification_credential_authenticator_data_description(),
          verificationLoading,
        );
    return [
      first,
      pendingStage(
        "cryptographic-proof",
        m.lab_verification_cryptographic_proof(),
        m.lab_verification_cryptographic_proof_description(),
      ),
      pendingStage(
        "signature-counter",
        m.lab_verification_signature_counter(),
        m.lab_verification_signature_counter_description(),
      ),
    ];
  }

  let routeStages = $derived.by((): LabVerificationStage[] => {
    if (makeVerification) {
      const localStages = buildMakeCredentialVerificationStages(makeVerification);
      const trustStage = attestationTrust.phase === "ready"
        ? buildAttestationTrustStage(attestationTrust.verification)
        : attestationTrust.phase === "error"
          ? unavailableStage(
              "attestation-trust",
              m.lab_attestation_trust_title(),
              m.lab_attestation_trust_description(),
            )
          : pendingStage(
              "attestation-trust",
              m.lab_attestation_trust_title(),
              m.lab_attestation_trust_description(),
              attestationTrust.phase === "loading",
            );
      return [...localStages, trustStage];
    }
    if (getVerification) {
      return selectedAssertion
        ? buildAssertionVerificationStages(selectedAssertion, getVerification)
        : buildMissingAssertionStages(getVerification);
    }
    return mode === "make" ? pendingMakeStages() : pendingGetStages();
  });
  let overallStatus = $derived(aggregateVerificationStatus(routeStages));

  function statusVariant(status: LabVerificationStageStatus): BadgeVariant {
    if (status === "failed") return "destructive";
    if (status === "warning") return "warning";
    if (status === "verified") return "secondary";
    return "outline";
  }

  function runtimeFailure(stageID: string) {
    if (
      stageID === "attestation-trust"
      && attestationTrust.phase === "error"
    ) {
      return {
        message: failureMessage(attestationTrust.error) ?? m.lab_attestation_trust_error(),
        retryLabel: m.lab_attestation_trust_retry(),
        retry: onRetryAttestationTrust,
      };
    }
    if (
      (stageID === "authenticator-data"
        || stageID === "credential-authenticator-data")
      && verificationState.phase === "error"
    ) {
      return {
        message: failureMessage(verificationState.error) ?? m.lab_verification_error(),
        retryLabel: m.lab_verification_retry(),
        retry: onRetryVerification,
      };
    }
    return null;
  }

  function changeAssertion(next: string | string[]) {
    if (!Array.isArray(next)) selectedAssertionValue = next;
  }

  function stageSummary(status: LabVerificationStageStatus) {
    switch (status) {
      case "verified":
        return m.lab_verification_stage_verified_summary();
      case "failed":
        return m.lab_verification_stage_failed_summary();
      case "unavailable":
        return m.lab_verification_stage_unavailable_summary();
      case "warning":
        return m.lab_verification_stage_warning_summary();
      case "not-applicable":
        return m.lab_verification_stage_not_applicable_summary();
      case "loading":
        return m.lab_verification_stage_loading_summary();
      case "pending":
        return m.lab_verification_stage_pending_summary();
      case "neutral":
        return m.lab_verification_stage_neutral_summary();
    }
  }
</script>

{#snippet statusIcon(status: LabVerificationStageStatus)}
  {#if status === "verified"}
    <CircleCheck aria-hidden="true" />
  {:else if status === "failed"}
    <CircleX aria-hidden="true" />
  {:else if status === "warning"}
    <TriangleAlert aria-hidden="true" />
  {:else if status === "loading"}
    <Spinner aria-hidden="true" />
  {:else}
    <CircleDashed aria-hidden="true" />
  {/if}
{/snippet}

{#snippet checkIcon(tone: LabVerificationCheckTone)}
  {#if tone === "ok"}
    <CircleCheck aria-hidden="true" />
  {:else if tone === "bad"}
    <CircleX aria-hidden="true" />
  {:else if tone === "warning"}
    <TriangleAlert aria-hidden="true" />
  {:else}
    <CircleDashed aria-hidden="true" />
  {/if}
{/snippet}

{#snippet routeList(stages: LabVerificationStage[], routeID: string)}
  <ol class="lab-verification-route">
    {#each stages as stage (stage.id)}
      {@const runtime = runtimeFailure(stage.id)}
      <li class="lab-verification-stage" data-status={stage.status}>
        <span class="lab-verification-stage-marker" aria-hidden="true">
          {@render statusIcon(stage.status)}
        </span>
        <article class="lab-verification-stage-body">
          <header class="lab-verification-stage-header">
            <div>
              <h4>{stage.title}</h4>
              <p>{stage.description}</p>
            </div>
          </header>

          <div class="lab-verification-stage-summary" data-status={stage.status}>
            <span class="lab-verification-status-marker" aria-hidden="true">
              {@render statusIcon(stage.status)}
            </span>
            <div>
              <strong>{stage.statusLabel}</strong>
              <span>{stageSummary(stage.status)}</span>
            </div>
          </div>

          {#if stage.checks.length}
            <section class="lab-verification-group" aria-labelledby={`${routeID}-${stage.id}-checks`}>
              <h5 id={`${routeID}-${stage.id}-checks`}>{m.lab_verification_checks()}</h5>
              <dl class="lab-verification-checks">
                {#each stage.checks as check (`${check.label}:${check.value}`)}
                  <div class="lab-verification-check" data-tone={check.tone}>
                    <dt>{check.label}</dt>
                    <dd>
                      <span class="lab-verification-check-marker" aria-hidden="true">
                        {@render checkIcon(check.tone)}
                      </span>
                      <span>{check.value}</span>
                    </dd>
                  </div>
                {/each}
              </dl>
            </section>
          {/if}

          {#if stage.details.length}
            <section class="lab-verification-group" aria-labelledby={`${routeID}-${stage.id}-details`}>
              <h5 id={`${routeID}-${stage.id}-details`}>{m.lab_verification_details()}</h5>
              <dl class="lab-verification-details">
                {#each stage.details as detail (`${detail.label}:${detail.values.join(":")}`)}
                  <div
                    class="lab-verification-detail"
                    data-kind="detail"
                    data-presentation={detail.presentation}
                  >
                    <dt>{detail.label}</dt>
                    <dd>
                      {#if detail.presentation === "tags"}
                        <span class="lab-verification-tags">
                          {#each detail.values as value (value)}
                            <Badge variant="outline"><code>{value}</code></Badge>
                          {/each}
                        </span>
                      {:else if detail.presentation === "code"}
                        <code>{detail.values[0]}</code>
                      {:else}
                        <span>{detail.values[0]}</span>
                      {/if}
                    </dd>
                  </div>
                {/each}
              </dl>
            </section>
          {/if}

          {#if stage.issues.length}
            <Alert.Root variant={stage.status === "failed" ? "destructive" : "default"}>
              <TriangleAlert />
              <Alert.Title>{m.lab_verification_issues()}</Alert.Title>
              <Alert.Description>
                <ul class="lab-verification-codes">
                  {#each stage.issues as issue (issue)}
                    <li><code>{issue}</code></li>
                  {/each}
                </ul>
              </Alert.Description>
            </Alert.Root>
          {/if}

          {#if stage.warnings.length}
            <Alert.Root variant="warning">
              <TriangleAlert />
              <Alert.Title>{m.lab_verification_warnings()}</Alert.Title>
              <Alert.Description>
                <ul class="lab-verification-codes">
                  {#each stage.warnings as warning (warning)}
                    <li><code>{warning}</code></li>
                  {/each}
                </ul>
              </Alert.Description>
            </Alert.Root>
          {/if}

          {#if runtime}
            <Alert.Root variant="destructive">
              <TriangleAlert />
              <Alert.Title>
                {stage.id === "attestation-trust"
                  ? m.lab_attestation_trust_error()
                  : m.lab_verification_error()}
              </Alert.Title>
              <Alert.Description>
                <p>{runtime.message}</p>
                <Button type="button" size="sm" variant="outline" onclick={runtime.retry}>
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  {runtime.retryLabel}
                </Button>
              </Alert.Description>
            </Alert.Root>
          {/if}
        </article>
      </li>
    {/each}
  </ol>
{/snippet}

<section class="lab-verification" aria-labelledby={`lab-${mode}-verification-title`}>
  <header class="lab-verification-header">
    <div>
      <h3 id={`lab-${mode}-verification-title`}>
        <ShieldCheck aria-hidden="true" />
        {m.lab_verification_title()}
      </h3>
      <p>{m.lab_verification_description()}</p>
    </div>
    <Badge variant={statusVariant(overallStatus)}>
      {@render statusIcon(overallStatus)}
      {verificationStatusLabel(overallStatus)}
    </Badge>
  </header>

  {#if getVerification?.assertions.length && getVerification.assertions.length > 1}
    <Tabs.Root
      value={selectedAssertionValue}
      onValueChange={changeAssertion}
      class="lab-verification-assertion-tabs"
    >
      <Tabs.List aria-label={m.lab_verification_title()}>
        {#each getVerification.assertions as assertion (assertion.index)}
          <Tabs.Trigger value={String(assertion.index)}>
            {m.lab_verification_assertion({ index: assertion.index })}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each getVerification.assertions as assertion (assertion.index)}
        <Tabs.Content value={String(assertion.index)}>
          <div class="lab-verification-credential">
            <span>{m.lab_credential_id()}</span>
            <code>{assertion.credentialIDHex}</code>
          </div>
          {@render routeList(
            buildAssertionVerificationStages(assertion, getVerification),
            `lab-get-${assertion.index}`,
          )}
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  {:else}
    {#if selectedAssertion}
      <div class="lab-verification-credential">
        <span>{m.lab_credential_id()}</span>
        <code>{selectedAssertion.credentialIDHex}</code>
      </div>
    {/if}
    {@render routeList(routeStages, `lab-${mode}`)}
  {/if}
</section>

<style>
@layer composition {
  .lab-verification-route,
  .lab-verification-checks,
  .lab-verification-details {
    display: grid;
    min-width: 0;
  }

  .lab-verification-checks {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .lab-verification-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@layer blocks {
  .lab-verification {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    padding-block: var(--space-2);
  }

  .lab-verification-header,
  .lab-verification-stage-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .lab-verification-header {
    align-items: center;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .lab-verification-header > div,
  .lab-verification-stage-header > div {
    display: grid;
    flex: 1 1 20rem;
    gap: var(--space-1);
    min-width: 0;
  }

  .lab-verification-header h3,
  .lab-verification-stage-header h4,
  .lab-verification-header p,
  .lab-verification-stage-header p {
    margin: 0;
  }

  .lab-verification-header h3 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.9rem;
  }

  .lab-verification-header h3 :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .lab-verification-header p,
  .lab-verification-stage-header p {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .lab-verification-route {
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lab-verification-stage {
    position: relative;
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr);
    gap: var(--space-3);
    min-width: 0;
    padding-bottom: var(--space-4);
  }

  .lab-verification-stage:last-child {
    padding-bottom: 0;
  }

  .lab-verification-stage:not(:last-child)::after {
    position: absolute;
    z-index: 0;
    top: 1.75rem;
    bottom: 0;
    left: calc(0.875rem - 0.5px);
    width: 1px;
    background: var(--border);
    content: "";
  }

  .lab-verification-stage-marker {
    position: relative;
    z-index: 1;
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--muted-foreground);
  }

  .lab-verification-stage-marker :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .lab-verification-stage-body {
    container-name: verification-stage;
    container-type: inline-size;
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
    background: var(--card);
  }

  .lab-verification-stage-header h4 {
    font-size: 0.82rem;
  }

  .lab-verification-stage-summary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    background: var(--muted);
  }

  .lab-verification-stage-summary > div {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .lab-verification-stage-summary strong {
    font-size: 0.72rem;
  }

  .lab-verification-stage-summary > div > span {
    color: var(--muted-foreground);
    font-size: 0.68rem;
    line-height: 1.35;
  }

  .lab-verification-status-marker,
  .lab-verification-check-marker {
    display: inline-grid;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: var(--muted);
    color: var(--muted-foreground);
  }

  .lab-verification-status-marker {
    width: 1.35rem;
    height: 1.35rem;
  }

  .lab-verification-check-marker {
    width: 1.2rem;
    height: 1.2rem;
  }

  .lab-verification-status-marker :global(svg),
  .lab-verification-check-marker :global(svg) {
    width: 0.72rem;
    height: 0.72rem;
  }

  .lab-verification-group {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .lab-verification-group h5 {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .lab-verification-checks,
  .lab-verification-details {
    margin: 0;
  }

  .lab-verification-check {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    background: var(--card);
  }

  .lab-verification-check dt,
  .lab-verification-detail dt {
    color: var(--muted-foreground);
    font-size: 0.68rem;
  }

  .lab-verification-check dd {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    color: var(--foreground);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .lab-verification-check dd > span:last-child {
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: end;
  }

  .lab-verification-detail {
    display: grid;
    grid-template-columns: minmax(7rem, 0.65fr) minmax(0, 1fr);
    align-items: baseline;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--border);
  }

  .lab-verification-detail dd {
    min-width: 0;
    margin: 0;
    color: var(--foreground);
    font-size: 0.72rem;
    text-align: end;
  }

  .lab-verification-detail dd > span,
  .lab-verification-detail dd > code {
    overflow-wrap: anywhere;
  }

  .lab-verification-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-1);
  }

  .lab-verification-tags code {
    font-size: 0.64rem;
  }

  .lab-verification-codes {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding-left: var(--space-4);
  }

  .lab-verification-codes code,
  .lab-verification-credential code {
    overflow-wrap: anywhere;
    font-size: 0.7rem;
  }

  .lab-verification-credential {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 0;
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  :global(.lab-verification-assertion-tabs [data-slot="tabs-list"]) {
    width: 100%;
  }

  :global(.lab-verification-assertion-tabs [data-slot="tabs-content"]) {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  @container verification-stage (max-width: 70rem) {
    .lab-verification-checks {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @container verification-stage (max-width: 46rem) {
    .lab-verification-checks,
    .lab-verification-details {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @container verification-stage (max-width: 30rem) {
    .lab-verification-check,
    .lab-verification-detail {
      grid-template-columns: minmax(0, 1fr);
    }

    .lab-verification-check dd,
    .lab-verification-detail dd {
      text-align: start;
    }

    .lab-verification-tags {
      justify-content: flex-start;
    }
  }
}

@layer exceptions {
  .lab-verification-stage[data-status="verified"] .lab-verification-stage-marker,
  .lab-verification-stage-summary[data-status="verified"] .lab-verification-status-marker,
  .lab-verification-check[data-tone="ok"] .lab-verification-check-marker {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .lab-verification-stage[data-status="failed"] .lab-verification-stage-marker,
  .lab-verification-stage-summary[data-status="failed"] .lab-verification-status-marker,
  .lab-verification-check[data-tone="bad"] .lab-verification-check-marker {
    border-color: color-mix(in srgb, var(--destructive) 45%, var(--border));
    background: color-mix(in srgb, var(--destructive) 14%, var(--card));
    color: var(--destructive);
  }

  .lab-verification-stage[data-status="warning"] .lab-verification-stage-marker,
  .lab-verification-stage-summary[data-status="warning"] .lab-verification-status-marker,
  .lab-verification-check[data-tone="warning"] .lab-verification-check-marker {
    border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
    background: var(--warning);
    color: var(--warning-foreground);
  }

  .lab-verification-stage-summary[data-status="failed"] {
    border-color: color-mix(in srgb, var(--destructive) 30%, var(--border));
    background: color-mix(in srgb, var(--destructive) 8%, var(--card));
  }

  .lab-verification-stage-summary[data-status="warning"] {
    border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
    background: color-mix(in srgb, var(--warning) 10%, var(--card));
  }
}
</style>
