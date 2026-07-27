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
    SignCountStatus,
    VerificationStatus,
    type AssertionVerification,
    type GetAssertionVerification,
    type MakeCredentialVerification,
    type VerificationIssueCode,
    type VerificationStatus as VerificationStatusValue,
  } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import type { LabVerificationState } from "$lib/features/lab/state";
  import { failureMessage } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mode: "make" | "get";
    state: LabVerificationState<MakeCredentialVerification | GetAssertionVerification>;
    onRetry: () => void;
  };

  let { mode, state: verificationState, onRetry }: Props = $props();
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

  function statusLabel(status: VerificationStatusValue) {
    if (status === VerificationStatus.VerificationStatusVerified) {
      return m.lab_verification_verified();
    }
    if (status === VerificationStatus.VerificationStatusFailed) {
      return m.lab_verification_failed();
    }
    return m.lab_verification_unavailable();
  }

  function statusVariant(status: VerificationStatusValue): BadgeVariant {
    if (status === VerificationStatus.VerificationStatusFailed) return "destructive";
    if (status === VerificationStatus.VerificationStatusVerified) return "secondary";
    return "outline";
  }

  function booleanLabel(value: boolean, positive: string, negative: string) {
    return value ? positive : negative;
  }

  function signatureLabel(value: boolean | null | undefined) {
    if (value === true) return m.lab_verification_valid();
    if (value === false) return m.lab_verification_invalid();
    return m.lab_verification_unavailable();
  }

  function signCountLabel(value: SignCountStatus) {
    if (value === SignCountStatus.SignCountStatusAdvanced) {
      return m.lab_verification_advanced();
    }
    if (value === SignCountStatus.SignCountStatusNotAdvanced) {
      return m.lab_verification_not_advanced();
    }
    if (value === SignCountStatus.SignCountStatusUnsupported) {
      return m.lab_verification_unsupported();
    }
    return m.lab_verification_not_checked();
  }
</script>

{#snippet statusIcon(status: "ok" | "bad" | "warn" | "neutral")}
  {#if status === "ok"}
    <CircleCheck aria-hidden="true" />
  {:else if status === "bad"}
    <CircleX aria-hidden="true" />
  {:else if status === "warn"}
    <TriangleAlert aria-hidden="true" />
  {:else}
    <CircleDashed aria-hidden="true" />
  {/if}
{/snippet}

{#snippet fact(label: string, value: string, status: "ok" | "bad" | "warn" | "neutral")}
  <div class="lab-verification-fact" data-status={status}>
    <dt>{label}</dt>
    <dd>
      {@render statusIcon(status)}
      {value}
    </dd>
  </div>
{/snippet}

{#snippet findings(label: string, codes: VerificationIssueCode[], tone: "issue" | "warning")}
  <div class="lab-verification-findings" data-tone={tone}>
    <span>{label}</span>
    {#if codes.length}
      <ul>
        {#each codes as code (code)}
          <li><code>{code}</code></li>
        {/each}
      </ul>
    {:else}
      <span>{m.lab_verification_no_findings()}</span>
    {/if}
  </div>
{/snippet}

{#snippet assertionFacts(verification: AssertionVerification)}
  <div class="lab-verification-assertion-heading">
    <code>{verification.credentialIDHex}</code>
    <Badge variant={statusVariant(verification.status)}>
      {#if verification.status === VerificationStatus.VerificationStatusVerified}
        <CircleCheck aria-hidden="true" />
      {:else if verification.status === VerificationStatus.VerificationStatusFailed}
        <CircleX aria-hidden="true" />
      {:else}
        <CircleDashed aria-hidden="true" />
      {/if}
      {statusLabel(verification.status)}
    </Badge>
  </div>
  <dl class="lab-verification-matrix">
    {@render fact(
      m.lab_verification_rp_id_hash(),
      booleanLabel(
        verification.rpIDHashMatches,
        m.lab_verification_matches(),
        m.lab_verification_does_not_match(),
      ),
      verification.rpIDHashMatches ? "ok" : "bad",
    )}
    {@render fact(
      m.lab_user_presence(),
      booleanLabel(
        verification.userPresenceRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      verification.userPresenceRequirementMet ? "ok" : "bad",
    )}
    {@render fact(
      m.lab_user_verification(),
      booleanLabel(
        verification.userVerificationRequirementMet,
        m.lab_verification_requirement_met(),
        m.lab_verification_not_met(),
      ),
      verification.userVerificationRequirementMet ? "ok" : "bad",
    )}
    {@render fact(
      m.lab_verification_credential_allowed(),
      booleanLabel(
        verification.credentialAllowed,
        m.lab_verification_allowed(),
        m.lab_verification_disallowed(),
      ),
      verification.credentialAllowed ? "ok" : "bad",
    )}
    {@render fact(
      m.lab_signature(),
      signatureLabel(verification.signatureValid),
      verification.signatureValid === true
        ? "ok"
        : verification.signatureValid === false ? "bad" : "neutral",
    )}
    {@render fact(
      m.lab_verification_sign_count(),
      signCountLabel(verification.signCount),
      verification.signCount === SignCountStatus.SignCountStatusNotAdvanced ? "warn" : "neutral",
    )}
  </dl>
  <div class="lab-verification-finding-groups">
    {@render findings(
      m.lab_verification_issues(),
      verification.issues ?? [],
      "issue",
    )}
    {@render findings(
      m.lab_verification_warnings(),
      verification.warnings ?? [],
      "warning",
    )}
  </div>
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
    {#if readyVerification}
      <Badge variant={statusVariant(readyVerification.status)}>
        {#if readyVerification.status === VerificationStatus.VerificationStatusVerified}
          <CircleCheck aria-hidden="true" />
        {:else if readyVerification.status === VerificationStatus.VerificationStatusFailed}
          <CircleX aria-hidden="true" />
        {:else}
          <CircleDashed aria-hidden="true" />
        {/if}
        {statusLabel(readyVerification.status)}
      </Badge>
    {/if}
  </header>

  {#if verificationState.phase === "loading"}
    <div class="lab-verification-loading">
      <Spinner aria-hidden="true" />
      <span>{m.lab_verification_loading()}</span>
    </div>
  {:else if verificationState.phase === "error"}
    <Alert.Root variant="destructive" role="alert">
      <TriangleAlert />
      <Alert.Title>{m.lab_verification_error()}</Alert.Title>
      <Alert.Description>
        <p>{failureMessage(verificationState.error) ?? m.lab_verification_error()}</p>
        <Button type="button" size="sm" variant="outline" onclick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {m.lab_verification_retry()}
        </Button>
      </Alert.Description>
    </Alert.Root>
  {:else if makeVerification}
    <div class="lab-verification-assertion-heading">
      <div class="lab-verification-attestation">
        <Badge variant="outline">{makeVerification.attestationFormat}</Badge>
        <code>{makeVerification.attestationType}</code>
      </div>
    </div>
    <dl class="lab-verification-matrix">
      {@render fact(
        m.lab_verification_rp_id_hash(),
        booleanLabel(
          makeVerification.rpIDHashMatches,
          m.lab_verification_matches(),
          m.lab_verification_does_not_match(),
        ),
        makeVerification.rpIDHashMatches ? "ok" : "bad",
      )}
      {@render fact(
        m.lab_user_presence(),
        booleanLabel(
          makeVerification.userPresenceRequirementMet,
          m.lab_verification_requirement_met(),
          m.lab_verification_not_met(),
        ),
        makeVerification.userPresenceRequirementMet ? "ok" : "bad",
      )}
      {@render fact(
        m.lab_user_verification(),
        booleanLabel(
          makeVerification.userVerificationRequirementMet,
          m.lab_verification_requirement_met(),
          m.lab_verification_not_met(),
        ),
        makeVerification.userVerificationRequirementMet ? "ok" : "bad",
      )}
      {@render fact(
        m.lab_verification_credential_algorithm(),
        booleanLabel(
          makeVerification.credentialAlgorithmAllowed,
          m.lab_verification_allowed(),
          m.lab_verification_disallowed(),
        ),
        makeVerification.credentialAlgorithmAllowed ? "ok" : "bad",
      )}
      {@render fact(
        m.lab_signature(),
        signatureLabel(makeVerification.signatureValid),
        makeVerification.signatureValid === true
          ? "ok"
          : makeVerification.signatureValid === false ? "bad" : "neutral",
      )}
    </dl>
    {@render findings(
      m.lab_verification_issues(),
      makeVerification.issues ?? [],
      "issue",
    )}
  {:else if getVerification}
    {@render findings(
      m.lab_verification_issues(),
      getVerification.issues ?? [],
      "issue",
    )}
    {#if getVerification.assertions.length === 1}
      {@render assertionFacts(getVerification.assertions[0])}
    {:else if getVerification.assertions.length > 1}
      <Tabs.Root bind:value={selectedAssertionValue} class="lab-verification-assertions">
        <Tabs.List>
          {#each getVerification.assertions as assertion (assertion.index)}
            <Tabs.Trigger value={String(assertion.index)}>
              {m.lab_verification_assertion({ index: assertion.index })}
              <Badge variant={statusVariant(assertion.status)}>{statusLabel(assertion.status)}</Badge>
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
        {#each getVerification.assertions as assertion (assertion.index)}
          <Tabs.Content value={String(assertion.index)}>
            {@render assertionFacts(assertion)}
          </Tabs.Content>
        {/each}
      </Tabs.Root>
    {/if}
  {/if}
</section>

<style>
@layer compositions {
  .lab-verification-matrix {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-5);
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
  .lab-verification-assertion-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .lab-verification-header {
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .lab-verification-header > div,
  .lab-verification-header h3,
  .lab-verification-header p {
    margin: 0;
  }

  .lab-verification-header > div {
    display: grid;
    gap: var(--space-1);
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

  .lab-verification-header p {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .lab-verification-loading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 3rem;
    color: var(--muted-foreground);
    font-size: 0.78rem;
  }

  .lab-verification-fact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-width: 0;
    padding-block: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .lab-verification-fact dt,
  .lab-verification-fact dd {
    margin: 0;
  }

  .lab-verification-fact dt {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .lab-verification-fact dd {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.75rem;
    font-weight: 500;
    text-align: end;
  }

  .lab-verification-fact dd :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .lab-verification-attestation,
  .lab-verification-finding-groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .lab-verification-finding-groups {
    display: grid;
    gap: var(--space-2);
  }

  .lab-verification-findings {
    display: grid;
    grid-template-columns: minmax(7rem, auto) minmax(0, 1fr);
    gap: var(--space-3);
    align-items: start;
    font-size: 0.72rem;
  }

  .lab-verification-findings > span {
    color: var(--muted-foreground);
  }

  .lab-verification-findings ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lab-verification-findings code,
  .lab-verification-assertion-heading code {
    overflow-wrap: anywhere;
  }

  :global(.lab-verification-assertions) {
    min-width: 0;
  }

  :global(.lab-verification-assertions > [data-slot="tabs-list"]) {
    width: 100%;
  }

  :global(.lab-verification-assertions [data-slot="tabs-trigger"]) {
    min-width: 0;
  }

  :global(.lab-verification-assertions [data-slot="tabs-content"]) {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    padding-top: var(--space-2);
  }

  :global(.lab-verification [data-slot="alert-description"]) {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
  }

  :global(.lab-verification [data-slot="alert-description"] p) {
    margin: 0;
  }

  @container workspace (max-width: 42rem) {
    .lab-verification-matrix {
      grid-template-columns: minmax(0, 1fr);
    }

    .lab-verification-findings {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-1);
    }
  }
}

@layer exceptions {
  .lab-verification-fact[data-status="bad"] dd,
  .lab-verification-findings[data-tone="issue"] code {
    color: var(--destructive);
  }

  .lab-verification-fact[data-status="neutral"] dd {
    color: var(--muted-foreground);
  }

  .lab-verification-fact[data-status="warn"] dd,
  .lab-verification-findings[data-tone="warning"] code {
    color: var(--warning-foreground);
  }
}
</style>
