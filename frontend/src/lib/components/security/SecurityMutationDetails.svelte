<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  import type { Warning } from "../../../../bindings/github.com/go-ctap/kit/model/safety";

  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import {
    authenticatorConfigPreview,
    bioEnrollPreview,
    bioEnrollResult,
    bioMutationPreview,
    resetFactoryPreview,
  } from "$lib/ctapkit-results";
  import type { SecurityMutationState } from "$lib/features/security/state";
  import type { ActiveOperation } from "$lib/features/workbench/state";
  import { failureMessage as localizeFailure, isCanceledFailure } from "$lib/failure";
  import { bioSampleStatusLabel } from "$lib/format";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";
  import { booleanState, reportedNumber, stateLabel } from "./security-ui.js";

  let {
    mutation,
    activeOperation,
  }: {
    mutation: SecurityMutationState;
    activeOperation: ActiveOperation | null;
  } = $props();

  let configPreview = $derived.by(() => {
    if (mutation.kind !== "alwaysUv" && mutation.kind !== "pinPolicy" && mutation.kind !== "longTouch") return null;
    const previewEnvelope = "previewEnvelope" in mutation ? mutation.previewEnvelope : null;
    const responseEnvelope = "responseEnvelope" in mutation ? mutation.responseEnvelope : null;
    return authenticatorConfigPreview(previewEnvelope ?? responseEnvelope);
  });
  let enrollmentPreview = $derived.by(() => {
    if (mutation.kind !== "bioEnroll") return null;
    const previewEnvelope = "previewEnvelope" in mutation ? mutation.previewEnvelope : null;
    const responseEnvelope = "responseEnvelope" in mutation ? mutation.responseEnvelope : null;
    return bioEnrollPreview(previewEnvelope ?? responseEnvelope);
  });
  let biometricPreview = $derived.by(() => {
    if (mutation.kind !== "bioRename" && mutation.kind !== "bioRemove") return null;
    const previewEnvelope = "previewEnvelope" in mutation ? mutation.previewEnvelope : null;
    const responseEnvelope = "responseEnvelope" in mutation ? mutation.responseEnvelope : null;
    return bioMutationPreview(previewEnvelope ?? responseEnvelope);
  });
  let resetPreview = $derived.by(() => {
    if (mutation.kind !== "reset") return null;
    const previewEnvelope = "previewEnvelope" in mutation ? mutation.previewEnvelope : null;
    const responseEnvelope = "responseEnvelope" in mutation ? mutation.responseEnvelope : null;
    return resetFactoryPreview(previewEnvelope ?? responseEnvelope);
  });
  let partialEnrollment = $derived.by(() => {
    if (mutation.kind !== "bioEnroll" || !("responseEnvelope" in mutation)) return null;
    return bioEnrollResult(mutation.responseEnvelope);
  });
  let warnings = $derived.by((): Warning[] => (
    configPreview?.warnings
    ?? enrollmentPreview?.warnings
    ?? biometricPreview?.warnings
    ?? resetPreview?.warnings
    ?? []
  ));
  let jsonPreview = $derived(
    configPreview
    ?? enrollmentPreview
    ?? biometricPreview
    ?? resetPreview,
  );
  let failureMessage = $derived.by(() => {
    if (mutation.phase !== "error") return null;
    if (mutation.failureReason === "missing-preview") return m.operation_missing_preview();
    if (mutation.failureReason === "missing-result") return m.operation_missing_result();
    return localizeFailure(mutation.runtimeError) ?? localizeFailure(mutation.responseEnvelope?.error) ?? m.operation_failed();
  });
  let failureCanceled = $derived(
    mutation.phase === "error" && (
      isCanceledFailure(mutation.runtimeError)
      || isCanceledFailure(mutation.responseEnvelope?.error)
    ),
  );
</script>

<div class="mutation-details">
  {#if failureMessage}
    <Alert.Root variant={failureCanceled ? "default" : "destructive"} role={failureCanceled ? "status" : "alert"}>
      <TriangleAlert aria-hidden="true" />
      <Alert.Title>{failureCanceled ? m.security_operation_canceled() : m.security_mutation_failed()}</Alert.Title>
      <Alert.Description>{failureMessage}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if configPreview}
    <dl class="preview-facts">
      {#if mutation.kind === "alwaysUv"}
        <div><dt>{m.current_value()}</dt><dd>{booleanState(configPreview.currentAlwaysUv)}</dd></div>
        <div><dt>{m.proposed_value()}</dt><dd>{booleanState(configPreview.requestedAlwaysUv)}</dd></div>
      {:else if mutation.kind === "longTouch"}
        <div><dt>{m.current_value()}</dt><dd>{booleanState(configPreview.currentLongTouchForReset)}</dd></div>
        <div><dt>{m.proposed_value()}</dt><dd>{booleanState(configPreview.requestedLongTouchForReset)}</dd></div>
      {:else}
        <div><dt>{m.current_value()}</dt><dd>{reportedNumber(configPreview.currentMinPINLength)}</dd></div>
        <div><dt>{m.proposed_value()}</dt><dd>{reportedNumber(configPreview.newMinPINLength)}</dd></div>
        <div><dt>{m.security_maximum_pin_length()}</dt><dd>{reportedNumber(configPreview.maxPINLength)}</dd></div>
        <div><dt>{m.security_rp_ids()}</dt><dd>{configPreview.minPinLengthRPIDs?.join(", ") || m.not_reported()}</dd></div>
        <div><dt>{m.security_force_pin_change()}</dt><dd>{booleanState(configPreview.forceChangePin)}</dd></div>
        <div><dt>{m.security_pin_complexity()}</dt><dd>{booleanState(configPreview.pinComplexityPolicy)}</dd></div>
      {/if}
    </dl>
  {:else if enrollmentPreview}
    <dl class="preview-facts">
      <div><dt>{m.support_mode()}</dt><dd>{enrollmentPreview.previewOnly ? m.preview_only() : m.status_supported()}</dd></div>
      <div><dt>{m.security_timeout()}</dt><dd>{m.security_seconds_short({ count: enrollmentPreview.timeoutMilliseconds / 1000 })}</dd></div>
    </dl>
  {:else if biometricPreview}
    <dl class="preview-facts">
      <div><dt>{m.security_enrollment_template()}</dt><dd><code>{biometricPreview.templateIDHex}</code></dd></div>
      {#if mutation.kind === "bioRename"}
        <div><dt>{m.security_friendly_name()}</dt><dd>{biometricPreview.friendlyName || m.security_unnamed_enrollment()}</dd></div>
      {/if}
      <div><dt>{m.support_mode()}</dt><dd>{biometricPreview.previewOnly ? m.preview_only() : m.status_supported()}</dd></div>
    </dl>
  {:else if resetPreview}
    <dl class="preview-facts">
      <div><dt>{m.security_long_touch_for_reset()}</dt><dd>{stateLabel(resetPreview.resetHints.longTouchForReset)}</dd></div>
      <div><dt>{m.security_transports_for_reset()}</dt><dd>{resetPreview.resetHints.transportsForReset?.join(", ") || m.not_reported()}</dd></div>
    </dl>
  {/if}

  {#if mutation.kind === "bioEnroll" && mutation.phase === "executing"}
    <section class="enrollment-progress" aria-labelledby="security-enrollment-progress-title">
      <div class="progress-heading">
        <h3 id="security-enrollment-progress-title">{m.security_enrollment_progress()}</h3>
        {#if activeOperation?.completed != null && activeOperation?.total != null}
          <span>{m.progress_completed_of_total({ completed: activeOperation.completed, total: activeOperation.total })}</span>
        {/if}
      </div>
      <Progress value={activeOperation?.completed ?? 0} max={activeOperation?.total ?? 1} />
      {#if activeOperation?.sampleStatus}
        <p>{m.security_enrollment_capture_status({ status: bioSampleStatusLabel(activeOperation.sampleStatus) })}</p>
      {/if}
    </section>
  {/if}

  {#if partialEnrollment}
    <Alert.Root variant="warning">
      <Alert.Title>{m.security_partial_enrollment()}</Alert.Title>
      <Alert.Description>
        {partialEnrollment.samples?.length ?? 0} ·
        {bioSampleStatusLabel(partialEnrollment.lastEnrollSampleStatus) || m.not_reported()}
      </Alert.Description>
    </Alert.Root>
  {/if}

  {#if warnings.length}
    <section class="preview-warnings" aria-labelledby="security-preview-warnings-title">
      <h3 id="security-preview-warnings-title">{m.preview_warnings()}</h3>
      {#each warnings as warning (warning.code)}
        <Alert.Root variant={warning.severity === "destructive" ? "destructive" : "warning"}>
          <Alert.Description>{warningMessage(warning)}</Alert.Description>
        </Alert.Root>
      {/each}
    </section>
  {/if}

  {#if jsonPreview}
    <JsonDisclosure value={jsonPreview} title={m.preview_json()} />
  {/if}
</div>

<style>
@layer blocks {
  .mutation-details,
  .preview-facts,
  .preview-warnings,
  .enrollment-progress {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .preview-facts,
  .preview-facts dt,
  .preview-facts dd,
  .preview-warnings h3,
  .enrollment-progress h3,
  .enrollment-progress p {
    margin: 0;
  }

  .preview-facts {
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .preview-facts > div {
    display: grid;
    grid-template-columns: minmax(8rem, 0.45fr) minmax(0, 1fr);
    gap: var(--space-2);
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }

  .preview-facts > div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .preview-facts dt {
    color: var(--muted-foreground);
  }

  .preview-facts dd {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .preview-warnings h3,
  .enrollment-progress h3 {
    font-size: 0.82rem;
  }

  .progress-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .enrollment-progress p,
  .progress-heading span {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }
}
</style>
