<script lang="ts">
  import { RefreshCw, TriangleAlert } from "@lucide/svelte";

  import SecurityAuthenticatorConfiguration from "$lib/components/security/SecurityAuthenticatorConfiguration.svelte";
  import SecurityBiometrics from "$lib/components/security/SecurityBiometrics.svelte";
  import SecurityFactoryReset from "$lib/components/security/SecurityFactoryReset.svelte";
  import SecurityMutationDialog from "$lib/components/security/SecurityMutationDialog.svelte";
  import SecurityOverview from "$lib/components/security/SecurityOverview.svelte";
  import SecurityPIN from "$lib/components/security/SecurityPIN.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    beginAlwaysUVChange,
    beginBioEnrollment,
    beginBioRemove,
    beginBioRename,
    beginEnterpriseAttestation,
    beginFactoryReset,
    beginLongTouchForReset,
    beginPINPolicyChange,
    changeAuthenticatorPIN,
    closeSecurityMutation,
    confirmSecurityMutation,
    reloadSecurity,
    reloadSecurityEnrollments,
    restartSecurityPreview,
    setAuthenticatorPIN,
  } from "$lib/features/security";
  import { authenticatorStatus, selectedSelector } from "$lib/features/authenticator";
  import { statusBar } from "$lib/features/workbench";
  import { cancelActiveOperation } from "$lib/operation-controller.js";
  import { configStatusReport } from "$lib/ctapkit-results";
  import {
    securityEnrollments,
    securityMutation,
    securitySensor,
    securityStatus,
  } from "$lib/features/security";

  import { m } from "../paraglide/messages.js";

  let report = $derived(configStatusReport($securityStatus.lastSuccessfulEnvelope));

  let statusLoading = $derived(
    $securityStatus.phase === "loading" || $securityStatus.phase === "refreshing",
  );

  let mutationBusy = $derived(
    $securityMutation.operation.phase === "previewing" ||
      $securityMutation.operation.phase === "executing",
  );

  let authenticatorReady = $derived(
    $authenticatorStatus.state === "ready" && Boolean($authenticatorStatus.selectionId),
  );

  let authenticatorRecovering = $derived(
    $authenticatorStatus.state === "opening" || $authenticatorStatus.state === "running",
  );

  let reloadDisabled = $derived(authenticatorRecovering || mutationBusy);

  let controlsDisabled = $derived(!authenticatorReady || mutationBusy);

  let mutationActionDisabled = $derived(
    $securityMutation.operation.phase === "error" ? reloadDisabled : !authenticatorReady,
  );

  let pinPolicyValidation = $derived(
    $securityMutation.kind === "pinPolicy" && $securityMutation.operation.phase === "editing"
      ? $securityMutation.operation.validationError
      : null,
  );
</script>

{#if $selectedSelector && (statusLoading || $authenticatorStatus.state === "opening") && !report}
  <section class="security-loading" aria-busy="true" aria-label={m.security_state_loading()}>
    <div class="security-loading-header">
      <Skeleton class="loading-title" />
      <Skeleton class="loading-copy" />
    </div>

    {#each Array(4) as _, index (index)}
      <Card.Root>
        <Card.Header>
          <Skeleton class="loading-heading" />
          <Skeleton class="loading-copy" />
        </Card.Header>

        <Card.Content><Skeleton class="loading-card" /></Card.Content>
      </Card.Root>
    {/each}
  </section>
{:else if $selectedSelector && !report}
  <EmptyState title={m.security_state_load_failed()} message={m.security_unsupported_message()}>
    {#snippet icon()}<TriangleAlert aria-hidden="true" />{/snippet}

    {#snippet actions()}
      <Button
        type="button"
        disabled={statusLoading || authenticatorRecovering}
        onclick={() => void reloadSecurity()}
      >
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {m.reload_overview()}
      </Button>
    {/snippet}
  </EmptyState>
{:else if $selectedSelector && report}
  <section class="security-screen" aria-label={m.security()}>
    <div class="security-sections">
      <SecurityOverview {report} />

      {#key $selectedSelector}
        <SecurityPIN
          pin={report.pin}
          disabled={controlsDisabled}
          onSetPIN={setAuthenticatorPIN}
          onChangePIN={changeAuthenticatorPIN}
        />
      {/key}

      <SecurityAuthenticatorConfiguration
        {report}
        disabled={controlsDisabled}
        validationError={pinPolicyValidation}
        onEnterpriseAttestation={beginEnterpriseAttestation}
        onAlwaysUVChange={beginAlwaysUVChange}
        onPINPolicyChange={beginPINPolicyChange}
        onPINPolicyEdit={() => void closeSecurityMutation()}
        onEnableLongTouch={beginLongTouchForReset}
      />

      <SecurityBiometrics
        bio={report.bio}
        sensorState={$securitySensor}
        enrollmentState={$securityEnrollments}
        disabled={controlsDisabled}
        loadDisabled={reloadDisabled}
        onReloadStatus={reloadSecurity}
        onLoadEnrollments={reloadSecurityEnrollments}
        onEnroll={beginBioEnrollment}
        onRename={beginBioRename}
        onRemove={beginBioRemove}
      />

      <SecurityFactoryReset
        resetHints={report.resetHints}
        disabled={controlsDisabled}
        onReset={beginFactoryReset}
      />
    </div>
  </section>

  <SecurityMutationDialog
    mutation={$securityMutation}
    activeOperation={$statusBar.activeOperation}
    disabled={mutationActionDisabled}
    onConfirm={confirmSecurityMutation}
    onPreview={restartSecurityPreview}
    onClose={() => void closeSecurityMutation()}
    onCancelOperation={async () => {
      await cancelActiveOperation();
    }}
  />
{/if}

<style>
  @layer blocks {
    .security-screen,
    .security-sections,
    .security-loading {
      display: grid;
      align-content: start;
      gap: var(--space-4);
      min-width: 0;
    }

    .security-loading-header {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    :global(.loading-title) {
      width: min(15rem, 70%);
      height: 1.5rem;
    }
    :global(.loading-heading) {
      width: min(11rem, 60%);
      height: 1rem;
    }
    :global(.loading-copy) {
      width: min(28rem, 85%);
      height: 0.8rem;
    }
    :global(.loading-card) {
      width: 100%;
      height: 7rem;
    }
  }
</style>
