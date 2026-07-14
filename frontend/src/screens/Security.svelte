<script lang="ts">
  import { RefreshCw, TriangleAlert } from "@lucide/svelte";

  import SecurityBiometrics from "$lib/components/security/SecurityBiometrics.svelte";
  import SecurityFactoryReset from "$lib/components/security/SecurityFactoryReset.svelte";
  import SecurityMutationDialog from "$lib/components/security/SecurityMutationDialog.svelte";
  import SecurityOverview from "$lib/components/security/SecurityOverview.svelte";
  import SecurityPIN from "$lib/components/security/SecurityPIN.svelte";
  import SecurityPINPolicy from "$lib/components/security/SecurityPINPolicy.svelte";
  import SecurityUserVerification from "$lib/components/security/SecurityUserVerification.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import {
    beginAlwaysUVChange,
    beginBioEnrollment,
    beginBioRemove,
    beginBioRename,
    beginFactoryReset,
    beginPINPolicyChange,
    cancelActiveOperation,
    changeAuthenticatorPIN,
    closeSecurityMutation,
    confirmSecurityMutation,
    reloadSecurity,
    reloadSecurityEnrollments,
    restartSecurityPreview,
    setAuthenticatorPIN,
  } from "$lib/controller";
  import { configStatusReport } from "$lib/ctapkit-results";
  import {
    securityEnrollments,
    securityMutation,
    securitySensor,
    securityStatus,
    selectedSelector,
    sessionStatus,
    statusBar,
  } from "$lib/stores";

  import { m } from "../paraglide/messages.js";

  let report = $derived(configStatusReport($securityStatus.lastSuccessfulEnvelope));
  let statusLoading = $derived(
    $securityStatus.phase === "loading" || $securityStatus.phase === "refreshing",
  );
  let mutationBusy = $derived(
    $securityMutation.phase === "previewing" || $securityMutation.phase === "executing",
  );
  let sessionReady = $derived($sessionStatus.state === "ready" && Boolean($sessionStatus.sessionId));
  let sessionRecovering = $derived(
    $sessionStatus.state === "opening" || $sessionStatus.state === "running",
  );
  let reloadDisabled = $derived(sessionRecovering || mutationBusy);
  let controlsDisabled = $derived(!sessionReady || mutationBusy);
  let mutationActionDisabled = $derived(
    $securityMutation.phase === "error" ? reloadDisabled : !sessionReady,
  );
  let pinPolicyValidation = $derived(
    $securityMutation.kind === "pinPolicy" && $securityMutation.phase === "editing"
      ? $securityMutation.validationError
      : null,
  );

</script>

{#if $selectedSelector && (statusLoading || $sessionStatus.state === "opening") && !report}
  <section class="security-loading" aria-busy="true" aria-label={m.security_state_loading()}>
    <div class="security-loading-header">
      <Skeleton class="loading-title" />
      <Skeleton class="loading-copy" />
    </div>
    {#each Array(5) as _, index (index)}
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
      <Button type="button" disabled={statusLoading || sessionRecovering} onclick={() => void reloadSecurity()}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {m.reload_overview()}
      </Button>
    {/snippet}
  </EmptyState>
{:else if $selectedSelector && report}
  <section class="security-screen" aria-labelledby="security-title">
    <div class="security-sections">
      <SecurityOverview
        {report}
        loading={statusLoading}
        disabled={reloadDisabled || statusLoading}
        onReload={reloadSecurity}
      />

      {#key $selectedSelector}
        <SecurityPIN
          pin={report.pin}
          disabled={controlsDisabled}
          onSetPIN={setAuthenticatorPIN}
          onChangePIN={changeAuthenticatorPIN}
        />
      {/key}

      <SecurityUserVerification
        pin={report.pin}
        uv={report.uv}
        authenticatorConfig={report.authenticatorConfig}
        disabled={controlsDisabled}
        onAlwaysUVChange={beginAlwaysUVChange}
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

      <SecurityPINPolicy
        {report}
        disabled={controlsDisabled}
        validationError={pinPolicyValidation}
        onChange={beginPINPolicyChange}
        onEdit={() => void closeSecurityMutation()}
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
    onCancelOperation={async () => { await cancelActiveOperation(); }}
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

  :global(.loading-title) { width: min(15rem, 70%); height: 1.5rem; }
  :global(.loading-heading) { width: min(11rem, 60%); height: 1rem; }
  :global(.loading-copy) { width: min(28rem, 85%); height: 0.8rem; }
  :global(.loading-card) { width: 100%; height: 7rem; }

}

</style>
