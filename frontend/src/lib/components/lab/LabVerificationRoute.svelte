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
    AttestationType,
    SignCountStatus,
    VerificationStatus,
    type AssertionVerification,
    type GetAssertionVerification,
    type MakeCredentialVerification,
    type VerificationStatus as VerificationStatusValue,
  } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";
  import {
    AttestationTrustStatus,
    type AttestationTrustAssessment,
  } from "../../../../bindings/github.com/go-ctap/mds/model";

  import * as Alert from "$lib/components/ui/alert";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import * as Tabs from "$lib/components/ui/tabs";
  import type { LabVerificationState } from "$lib/features/lab/state";
  import { failureMessage } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type StageStatus =
    | "verified"
    | "failed"
    | "unavailable"
    | "warning"
    | "not-applicable"
    | "neutral"
    | "loading"
    | "pending";

  type CheckTone = "ok" | "bad" | "warning" | "neutral";

  type Check = { label: string; value: string; tone: CheckTone };

  type Detail = {
    label: string;
    values: string[];
    presentation: "text" | "code" | "tags";
  };

  type Stage = {
    id: string;
    title: string;
    description: string;
    status: StageStatus;
    statusLabel?: string;
    checks: Check[];
    details: Detail[];
    issues: string[];
    warnings: string[];
  };

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
    mode === "make" ? (readyVerification as MakeCredentialVerification | null) : null,
  );

  let getVerification = $derived(
    mode === "get" ? (readyVerification as GetAssertionVerification | null) : null,
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

    if (
      !getVerification.assertions.some(
        (assertion) => String(assertion.index) === selectedAssertionValue,
      )
    ) {
      selectedAssertionValue = String(getVerification.assertions[0].index);
    }
  });

  function statusFromVerification(status: VerificationStatusValue): StageStatus {
    if (status === VerificationStatus.VerificationStatusVerified) return "verified";

    if (status === VerificationStatus.VerificationStatusFailed) return "failed";

    return "unavailable";
  }

  function statusLabel(status: StageStatus) {
    switch (status) {
      case "verified":
        return m.lab_verification_verified();
      case "failed":
        return m.lab_verification_failed();
      case "unavailable":
        return m.lab_verification_unavailable();
      case "warning":
        return m.lab_verification_warning();
      case "not-applicable":
        return m.lab_verification_not_applicable();
      case "loading":
        return m.lab_verification_in_progress();
      case "pending":
        return m.lab_verification_pending();
      case "neutral":
        return m.lab_verification_not_checked();
    }
  }

  function statusVariant(status: StageStatus): BadgeVariant {
    if (status === "failed") return "destructive";

    if (status === "warning") return "warning";

    if (status === "verified") return "secondary";

    return "outline";
  }

  function stageSummary(status: StageStatus) {
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

  function check(label: string, value: boolean, positive: string, negative: string): Check {
    return {
      label,
      value: value ? positive : negative,
      tone: value ? "ok" : "bad",
    };
  }

  function detail(
    label: string,
    value: string,
    presentation: Detail["presentation"] = "text",
  ): Detail {
    return { label, values: [value], presentation };
  }

  function pendingStage(
    id: string,
    title: string,
    description: string,
    status: "pending" | "loading" | "unavailable" = "pending",
  ): Stage {
    return { id, title, description, status, checks: [], details: [], issues: [], warnings: [] };
  }

  function makeAuthenticatorChecks(verification: MakeCredentialVerification): Check[] {
    if (verification.status !== VerificationStatus.VerificationStatusVerified) return [];

    return [
      check(
        m.lab_verification_rp_id_hash(),
        verification.rpIDHashMatches,
        m.lab_verification_matches(),
        m.lab_verification_does_not_match(),
      ),
      check(
        m.lab_user_presence(),
        verification.userPresenceRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      check(
        m.lab_user_verification(),
        verification.userVerificationRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      check(
        m.lab_verification_attested_data(),
        true,
        m.lab_verification_present(),
        m.lab_verification_missing(),
      ),
      check(
        m.lab_verification_credential_algorithm(),
        verification.credentialAlgorithmAllowed,
        m.lab_verification_allowed(),
        m.lab_verification_disallowed(),
      ),
    ];
  }

  function makeStages(verification: MakeCredentialVerification): Stage[] {
    let evidenceStatus: StageStatus;

    if (verification.attestationType === AttestationType.AttestationTypeNone) {
      evidenceStatus = "not-applicable";
    } else if (verification.signatureValid === true) {
      evidenceStatus = "verified";
    } else if (verification.signatureValid === false) {
      evidenceStatus = "failed";
    } else {
      evidenceStatus = "unavailable";
    }

    return [
      {
        id: "authenticator-data",
        title: m.lab_verification_authenticator_data(),
        description: m.lab_verification_authenticator_data_description(),
        status: statusFromVerification(verification.status),
        checks: makeAuthenticatorChecks(verification),
        details: [],
        issues: [...new Set(verification.issues ?? [])],
        warnings: [],
      },
      {
        id: "attestation-evidence",
        title: m.lab_verification_attestation_evidence(),
        description: m.lab_verification_attestation_evidence_description(),
        status: evidenceStatus,
        checks:
          verification.signatureValid === null || verification.signatureValid === undefined
            ? []
            : [
                check(
                  m.lab_signature(),
                  verification.signatureValid,
                  m.lab_verification_valid(),
                  m.lab_verification_invalid(),
                ),
              ],
        details: [
          detail(m.lab_format(), verification.attestationFormat || m.lab_not_reported(), "code"),
          detail(m.lab_attestation(), verification.attestationType || m.lab_not_reported(), "code"),
        ],
        issues: [],
        warnings: [],
      },
      trustStage(),
    ];
  }

  function assertionChecks(verification: AssertionVerification): Check[] {
    if (verification.status !== VerificationStatus.VerificationStatusVerified) return [];

    return [
      check(
        m.lab_verification_credential_allowed(),
        verification.credentialAllowed,
        m.lab_verification_allowed(),
        m.lab_verification_disallowed(),
      ),
      check(
        m.lab_verification_rp_id_hash(),
        verification.rpIDHashMatches,
        m.lab_verification_matches(),
        m.lab_verification_does_not_match(),
      ),
      check(
        m.lab_user_presence(),
        verification.userPresenceRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      check(
        m.lab_user_verification(),
        verification.userVerificationRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      check(
        m.lab_verification_attested_data(),
        true,
        m.lab_verification_absent_as_expected(),
        m.lab_verification_unexpected(),
      ),
    ];
  }

  function proofStage(verification: AssertionVerification): Stage {
    let status: StageStatus;

    if (verification.signatureValid === true) {
      status = "verified";
    } else if (verification.signatureValid === false) {
      status = "failed";
    } else {
      status = "unavailable";
    }

    return {
      id: "cryptographic-proof",
      title: m.lab_verification_cryptographic_proof(),
      description: m.lab_verification_cryptographic_proof_description(),
      status,
      checks:
        verification.signatureValid === null || verification.signatureValid === undefined
          ? []
          : [
              check(
                m.lab_signature(),
                verification.signatureValid,
                m.lab_verification_valid(),
                m.lab_verification_invalid(),
              ),
            ],
      details:
        verification.signatureValid === null || verification.signatureValid === undefined
          ? []
          : [
              detail(
                m.lab_verification_signed_data(),
                m.lab_verification_signed_data_value(),
                "code",
              ),
            ],
      issues: [],
      warnings: [],
    };
  }

  function counterStage(verification: AssertionVerification): Stage {
    let status: StageStatus;
    let label: string;

    switch (verification.signCount) {
      case SignCountStatus.SignCountStatusAdvanced:
        status = "verified";
        label = m.lab_verification_advanced();
        break;
      case SignCountStatus.SignCountStatusNotAdvanced:
        status = "warning";
        label = m.lab_verification_not_advanced();
        break;
      case SignCountStatus.SignCountStatusUnsupported:
        status = "not-applicable";
        label = m.lab_verification_unsupported();
        break;
      case SignCountStatus.SignCountStatusNotChecked:
      default:
        status = "neutral";
        label = m.lab_verification_not_checked();
    }

    return {
      id: "signature-counter",
      title: m.lab_verification_signature_counter(),
      description: m.lab_verification_signature_counter_description(),
      status,
      statusLabel: label,
      checks:
        status === "verified" || status === "warning"
          ? [
              {
                label: m.lab_verification_sign_count(),
                value: label,
                tone: status === "warning" ? "warning" : "ok",
              },
            ]
          : [],
      details:
        status === "verified" || status === "warning"
          ? []
          : [detail(m.lab_verification_sign_count(), label)],
      issues: [],
      warnings: [...new Set(verification.warnings ?? [])],
    };
  }

  function getStages(
    verification: GetAssertionVerification,
    assertion: AssertionVerification | undefined,
  ): Stage[] {
    const firstStatus = assertion
      ? statusFromVerification(assertion.status)
      : statusFromVerification(verification.status);
    const first: Stage = {
      id: "credential-authenticator-data",
      title: m.lab_verification_credential_authenticator_data(),
      description: m.lab_verification_credential_authenticator_data_description(),
      status: firstStatus,
      checks: assertion ? assertionChecks(assertion) : [],
      details: [
        detail(m.lab_verification_assertions_received(), String(verification.assertions.length)),
      ],
      issues: [...new Set([...(verification.issues ?? []), ...(assertion?.issues ?? [])])],
      warnings: [],
    };

    if (!assertion) {
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

    return [first, proofStage(assertion), counterStage(assertion)];
  }

  function trustStage(): Stage {
    if (attestationTrust.phase === "loading") {
      return pendingStage(
        "attestation-trust",
        m.lab_attestation_trust_title(),
        m.lab_attestation_trust_description(),
        "loading",
      );
    }

    if (attestationTrust.phase === "error") {
      return pendingStage(
        "attestation-trust",
        m.lab_attestation_trust_title(),
        m.lab_attestation_trust_description(),
        "unavailable",
      );
    }

    if (attestationTrust.phase !== "ready") {
      return pendingStage(
        "attestation-trust",
        m.lab_attestation_trust_title(),
        m.lab_attestation_trust_description(),
      );
    }

    const assessment = attestationTrust.verification;
    let status: StageStatus;
    let label: string;

    switch (assessment.status) {
      case AttestationTrustStatus.AttestationTrustStatusTrusted:
        status = "verified";
        label = m.lab_attestation_trust_trusted();
        break;
      case AttestationTrustStatus.AttestationTrustStatusUntrusted:
        status = "failed";
        label = m.lab_attestation_trust_untrusted();
        break;
      case AttestationTrustStatus.AttestationTrustStatusNotApplicable:
        status = "not-applicable";
        label = m.lab_attestation_trust_not_applicable();
        break;
      case AttestationTrustStatus.AttestationTrustStatusUnavailable:
      default:
        status = "unavailable";
        label = m.lab_verification_unavailable();
    }

    const checks: Check[] = [
      {
        label: m.lab_attestation_trust_metadata(),
        value: assessment.metadataFound
          ? m.lab_attestation_trust_found()
          : m.lab_attestation_trust_not_found(),
        tone: assessment.metadataFound ? "ok" : "neutral",
      },
    ];

    if (
      assessment.certificateChainTrusted !== null &&
      assessment.certificateChainTrusted !== undefined
    ) {
      checks.push(
        check(
          m.lab_attestation_trust_chain(),
          assessment.certificateChainTrusted,
          m.lab_attestation_trust_trusted(),
          m.lab_attestation_trust_untrusted(),
        ),
      );
    }

    return {
      id: "attestation-trust",
      title: m.lab_attestation_trust_title(),
      description: m.lab_attestation_trust_description(),
      status,
      statusLabel: label,
      checks,
      details: assessment.authenticatorStatuses?.length
        ? [
            {
              label: m.lab_attestation_trust_statuses(),
              values: assessment.authenticatorStatuses,
              presentation: "tags",
            },
          ]
        : [],
      issues: [...new Set(assessment.issues ?? [])],
      warnings: [],
    };
  }

  function pendingStages(): Stage[] {
    const localStatus =
      verificationState.phase === "loading"
        ? "loading"
        : verificationState.phase === "error"
          ? "unavailable"
          : "pending";

    if (mode === "make") {
      return [
        pendingStage(
          "authenticator-data",
          m.lab_verification_authenticator_data(),
          m.lab_verification_authenticator_data_description(),
          localStatus,
        ),
        pendingStage(
          "attestation-evidence",
          m.lab_verification_attestation_evidence(),
          m.lab_verification_attestation_evidence_description(),
        ),
        trustStage(),
      ];
    }

    return [
      pendingStage(
        "credential-authenticator-data",
        m.lab_verification_credential_authenticator_data(),
        m.lab_verification_credential_authenticator_data_description(),
        localStatus,
      ),
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

  let routeStages = $derived.by(() => {
    if (makeVerification) return makeStages(makeVerification);

    if (getVerification) return getStages(getVerification, selectedAssertion);

    return pendingStages();
  });

  let overallStatus = $derived.by((): StageStatus => {
    const statuses = routeStages.map((stage) => stage.status);

    if (statuses.includes("failed")) return "failed";

    if (statuses.includes("unavailable")) return "unavailable";

    if (statuses.includes("warning")) return "warning";

    if (statuses.includes("loading")) return "loading";

    if (statuses.includes("pending")) return "pending";

    if (statuses.includes("verified")) return "verified";

    if (statuses.includes("not-applicable")) return "not-applicable";

    return "neutral";
  });

  function runtimeFailure(stageID: string) {
    if (stageID === "attestation-trust" && attestationTrust.phase === "error") {
      return {
        message: failureMessage(attestationTrust.error) ?? m.lab_attestation_trust_error(),
        retryLabel: m.lab_attestation_trust_retry(),
        retry: onRetryAttestationTrust,
      };
    }

    if (
      (stageID === "authenticator-data" || stageID === "credential-authenticator-data") &&
      verificationState.phase === "error"
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
</script>

{#snippet statusIcon(status: StageStatus)}
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

{#snippet checkIcon(tone: CheckTone)}
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

{#snippet routeList(stages: Stage[], routeID: string)}
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
              <strong>{stage.statusLabel ?? statusLabel(stage.status)}</strong>
              <span>{stageSummary(stage.status)}</span>
            </div>
          </div>

          {#if stage.checks.length}
            <section
              class="lab-verification-group"
              aria-labelledby={`${routeID}-${stage.id}-checks`}
            >
              <h5 id={`${routeID}-${stage.id}-checks`}>{m.lab_verification_checks()}</h5>

              <dl class="lab-verification-checks">
                {#each stage.checks as item (`${item.label}:${item.value}`)}
                  <div class="lab-verification-check" data-tone={item.tone}>
                    <dt>{item.label}</dt>
                    <dd>
                      <span class="lab-verification-check-marker" aria-hidden="true">
                        {@render checkIcon(item.tone)}
                      </span>
                      <span>{item.value}</span>
                    </dd>
                  </div>
                {/each}
              </dl>
            </section>
          {/if}

          {#if stage.details.length}
            <section
              class="lab-verification-group"
              aria-labelledby={`${routeID}-${stage.id}-details`}
            >
              <h5 id={`${routeID}-${stage.id}-details`}>{m.lab_verification_details()}</h5>

              <dl class="lab-verification-details">
                {#each stage.details as item (`${item.label}:${item.values.join(":")}`)}
                  <div
                    class="lab-verification-detail"
                    data-kind="detail"
                    data-presentation={item.presentation}
                  >
                    <dt>{item.label}</dt>
                    <dd>
                      {#if item.presentation === "tags"}
                        <span class="lab-verification-tags">
                          {#each item.values as value (value)}
                            <Badge variant="outline"><code>{value}</code></Badge>
                          {/each}
                        </span>
                      {:else if item.presentation === "code"}
                        <code>{item.values[0]}</code>
                      {:else}
                        <span>{item.values[0]}</span>
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
      {statusLabel(overallStatus)}
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
          {@render routeList(getStages(getVerification, assertion), `lab-get-${assertion.index}`)}
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
