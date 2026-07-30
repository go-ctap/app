<script lang="ts">
  import { Fingerprint, Pencil, RefreshCw, Trash2, TriangleAlert } from "@lucide/svelte";

  import {
    BioModality,
    FingerprintKind,
    type BioEnrollmentRecord,
    type BioStatus,
  } from "../../../../bindings/github.com/go-ctap/kit/model/config";

  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as Table from "$lib/components/ui/table";
  import { bioListReport, bioSensorReport } from "$lib/ctapkit-results";
  import type { SecurityBioListState, SecurityBioSensorState } from "$lib/features/security/state";
  import { failureMessage } from "$lib/failure";

  import { m } from "../../../paraglide/messages.js";
  import { reportedNumber, utf8ByteLength } from "$lib/components/security/security-ui.js";

  type Props = {
    bio: BioStatus;
    sensorState: SecurityBioSensorState;
    enrollmentState: SecurityBioListState;
    disabled: boolean;
    loadDisabled: boolean;
    onReloadStatus: () => void | Promise<boolean>;
    onLoadEnrollments: () => void | Promise<boolean>;
    onEnroll: () => void | Promise<boolean>;
    onRename: (templateIDHex: string, friendlyName: string) => void | Promise<boolean>;
    onRemove: (templateIDHex: string) => void | Promise<boolean>;
  };

  let {
    bio,
    sensorState,
    enrollmentState,
    disabled,
    loadDisabled,
    onReloadStatus,
    onLoadEnrollments,
    onEnroll,
    onRename,
    onRemove,
  }: Props = $props();

  let sensor = $derived(bioSensorReport(sensorState.lastSuccessfulEnvelope));

  let enrollments = $derived(bioListReport(enrollmentState.lastSuccessfulEnvelope));

  let sensorError = $derived(
    failureMessage(sensorState.runtimeError) ?? failureMessage(sensorState.responseEnvelope?.error),
  );

  let enrollmentError = $derived(
    failureMessage(enrollmentState.runtimeError) ??
      failureMessage(enrollmentState.responseEnvelope?.error),
  );

  let sensorLoading = $derived(
    sensorState.phase === "loading" || sensorState.phase === "refreshing",
  );

  let enrollmentsLoading = $derived(
    enrollmentState.phase === "loading" || enrollmentState.phase === "refreshing",
  );

  let renameOpen = $state(false);

  let renameTarget = $state<BioEnrollmentRecord | null>(null);

  let friendlyName = $state("");

  let friendlyNameLimit = $derived(sensor?.maxTemplateFriendlyName ?? null);

  let friendlyNameBytes = $derived(utf8ByteLength(friendlyName));

  let friendlyNameInvalid = $derived(
    friendlyNameLimit != null && friendlyNameBytes > friendlyNameLimit,
  );

  function modalityLabel() {
    if (sensor?.modality === BioModality.BioModalityFingerprint) return m.security_fingerprint();

    return sensor?.modality || m.not_reported();
  }

  function fingerprintKindLabel() {
    if (sensor?.fingerprintKind === FingerprintKind.FingerprintKindTouch)
      return m.security_fingerprint_touch();

    if (sensor?.fingerprintKind === FingerprintKind.FingerprintKindSwipe)
      return m.security_fingerprint_swipe();

    return sensor?.fingerprintKind || m.not_reported();
  }

  function openRename(record: BioEnrollmentRecord) {
    renameTarget = record;
    friendlyName = record.friendlyName ?? "";
    renameOpen = true;
  }

  function closeRename() {
    renameOpen = false;
    renameTarget = null;
    friendlyName = "";
  }

  function handleRenameOpenChange(next: boolean) {
    if (!next) closeRename();
    else renameOpen = true;
  }

  function handleRename(event: SubmitEvent) {
    event.preventDefault();
    if (!renameTarget || friendlyNameInvalid) return;

    const operation = onRename(renameTarget.templateIDHex, friendlyName);

    closeRename();
    void operation;
  }
</script>

{#if bio.supported && sensorState.phase !== "unsupported" && sensor?.supported !== false}
  <Card.Root id="security-biometric-sensor" aria-labelledby="security-biometric-sensor-title">
    <Card.Header>
      <Card.Title>
        <h3 id="security-biometric-sensor-title" class="security-card-title">
          {m.security_biometric_sensor()}
        </h3>
      </Card.Title>
      {#if sensor?.previewOnly || bio.previewOnly}
        <Card.Action><Badge variant="secondary">{m.preview_only()}</Badge></Card.Action>
      {/if}
    </Card.Header>

    <Card.Content>
      {#if sensorLoading && !sensor}
        <div class="sensor-loading" aria-busy="true" aria-label={m.security_sensor_loading()}>
          <Skeleton class="sensor-skeleton" />
          <Skeleton class="sensor-skeleton" />
          <Skeleton class="sensor-skeleton" />
        </div>
      {:else}
        {#if sensorError}
          <Alert.Root variant="destructive" role="alert" class="sensor-alert">
            <TriangleAlert aria-hidden="true" />
            <Alert.Title>{m.security_sensor_load_failed()}</Alert.Title>
            <Alert.Description>{sensorError}</Alert.Description>
            <Alert.Action>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={loadDisabled}
                onclick={() => void onReloadStatus()}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {m.reload_overview()}
              </Button>
            </Alert.Action>
          </Alert.Root>
        {/if}

        {#if sensor}
          <dl class="sensor-facts">
            <div>
              <dt>{m.security_bio_modality()}</dt>
              <dd>{modalityLabel()}</dd>
            </div>

            <div>
              <dt>{m.security_fingerprint_kind()}</dt>
              <dd>{fingerprintKindLabel()}</dd>
            </div>

            <div>
              <dt>{m.security_capture_samples()}</dt>
              <dd>{reportedNumber(sensor.maxCaptureSamplesRequiredForEnroll)}</dd>
            </div>

            <div>
              <dt>{m.security_friendly_name_limit()}</dt>
              <dd>
                {sensor.maxTemplateFriendlyName == null
                  ? m.not_reported()
                  : m.reported_bytes({ count: sensor.maxTemplateFriendlyName })}
              </dd>
            </div>
          </dl>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
{/if}

{#if bio.supported && enrollmentState.phase !== "unsupported"}
  <Card.Root
    id="security-biometric-enrollments"
    aria-labelledby="security-biometric-enrollments-title"
  >
    <Card.Header>
      <Card.Title>
        <h2 id="security-biometric-enrollments-title" class="security-card-title">
          {m.security_biometric_enrollments()}
        </h2>
      </Card.Title>
      <Card.Action class="enrollment-actions">
        <Button type="button" {disabled} onclick={() => void onEnroll()}>
          <Fingerprint data-icon="inline-start" aria-hidden="true" />
          {m.security_enroll_biometric()}
        </Button>
        {#if bio.configured !== false}
          <Button
            variant="outline"
            type="button"
            disabled={loadDisabled || enrollmentsLoading}
            onclick={() => void onLoadEnrollments()}
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {m.security_load_enrollments()}
          </Button>
        {/if}
      </Card.Action>
    </Card.Header>

    <Card.Content class="enrollment-content">
      {#if bio.configured === false}
        <EmptyState
          title={m.security_bio_not_configured_title()}
          message={m.security_bio_not_configured_message()}
          variant="compact"
        >
          {#snippet icon()}<Fingerprint aria-hidden="true" />{/snippet}
        </EmptyState>
      {:else}
        {#if enrollmentsLoading && !enrollments}
          <div
            class="enrollment-loading"
            aria-busy="true"
            aria-label={m.security_enrollment_loading()}
          >
            {#each Array(3) as _, index (index)}
              <Skeleton class="enrollment-skeleton" />
            {/each}
          </div>
        {/if}

        {#if enrollmentError}
          <Alert.Root variant="destructive" role="alert" class="enrollment-alert">
            <TriangleAlert aria-hidden="true" />
            <Alert.Title>{m.security_enrollment_load_failed()}</Alert.Title>
            <Alert.Description>{enrollmentError}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if enrollments}
          {#if enrollments.previewOnly}
            <p class="preview-note" data-state="preview-only">
              <Badge variant="secondary">{m.preview_only()}</Badge>
              {m.security_preview_only_description()}
            </p>
          {/if}

          {#if enrollments.enrollments.length === 0}
            <EmptyState
              title={m.security_no_enrollments_title()}
              message={m.security_no_enrollments_message()}
              variant="compact"
            >
              {#snippet icon()}<Fingerprint aria-hidden="true" />{/snippet}
            </EmptyState>
          {:else}
            <div class="enrollment-table-frame">
              <Table.Root>
                <Table.Caption class="sr-only">{m.security_biometric_enrollments()}</Table.Caption>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>{m.security_enrollment_name()}</Table.Head>
                    <Table.Head>{m.security_enrollment_template()}</Table.Head>
                    <Table.Head
                      ><span class="sr-only">{m.security_enrollment_actions()}</span></Table.Head
                    >
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each enrollments.enrollments as enrollment (enrollment.templateIDHex)}
                    <Table.Row>
                      <Table.Cell
                        >{enrollment.friendlyName || m.security_unnamed_enrollment()}</Table.Cell
                      >
                      <Table.Cell><code>{enrollment.templateIDHex}</code></Table.Cell>
                      <Table.Cell>
                        <div class="row-actions">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            {disabled}
                            aria-label={m.security_rename_enrollment()}
                            onclick={() => openRename(enrollment)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            {disabled}
                            aria-label={m.security_remove_enrollment()}
                            onclick={() => void onRemove(enrollment.templateIDHex)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          {/if}
        {:else if enrollmentState.phase === "idle"}
          <EmptyState
            title={m.security_biometric_enrollments()}
            message={m.security_biometric_enrollments_description()}
            variant="compact"
          >
            {#snippet icon()}<Fingerprint aria-hidden="true" />{/snippet}
          </EmptyState>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
{/if}

<Dialog.Root open={renameOpen} onOpenChange={handleRenameOpenChange}>
  {#if renameTarget}
    <Dialog.Content class="security-rename-dialog">
      <Dialog.Header>
        <Dialog.Title>{m.security_rename_enrollment()}</Dialog.Title>
        <Dialog.Description>{m.security_rename_enrollment_description()}</Dialog.Description>
      </Dialog.Header>

      <form class="rename-form" onsubmit={handleRename}>
        <Field.Field data-invalid={friendlyNameInvalid ? "true" : undefined}>
          <Field.Label for="security-friendly-name">{m.security_friendly_name()}</Field.Label>
          <Input
            id="security-friendly-name"
            value={friendlyName}
            aria-invalid={friendlyNameInvalid}
            autocomplete="off"
            oninput={(event) => (friendlyName = event.currentTarget.value)}
          />
          <Field.Description>
            {m.reported_bytes({ count: friendlyNameBytes })}
            {#if friendlyNameLimit != null}
              / {m.reported_bytes({ count: friendlyNameLimit })}{/if}
          </Field.Description>
          {#if friendlyNameInvalid && friendlyNameLimit != null}
            <Field.Error
              >{m.security_friendly_name_too_long({ count: friendlyNameLimit })}</Field.Error
            >
          {/if}
        </Field.Field>

        <Dialog.Footer>
          <Button type="submit" disabled={friendlyNameInvalid}>{m.preview_change()}</Button>
          <Button variant="outline" type="button" onclick={closeRename}>{m.cancel()}</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
  @layer blocks {
    .security-card-title,
    .sensor-facts,
    .sensor-facts dt,
    .sensor-facts dd,
    .preview-note {
      margin: 0;
    }

    .security-card-title {
      font: inherit;
    }

    :global(.enrollment-actions) {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }

    :global(.enrollment-content),
    .sensor-loading,
    .enrollment-loading,
    .rename-form {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .sensor-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2) var(--space-5);
      min-width: 0;
    }

    .sensor-facts > div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
      border-top: 1px solid var(--border);
      padding-top: var(--space-2);
    }

    .sensor-facts dt {
      color: var(--muted-foreground);
      font-size: 0.78rem;
    }

    .sensor-facts dd {
      font-weight: 650;
      text-align: end;
    }

    :global(.sensor-skeleton) {
      width: 100%;
      height: 2rem;
    }

    :global(.enrollment-skeleton) {
      width: 100%;
      height: 2.5rem;
    }

    .preview-note {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--muted-foreground);
      font-size: 0.78rem;
    }

    .enrollment-table-frame {
      min-width: 0;
      border: 1px solid var(--border);
    }

    .enrollment-table-frame code {
      overflow-wrap: anywhere;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-1);
    }

    :global(.security-rename-dialog) {
      width: min(29rem, calc(100vw - 2rem));
      max-width: none;
    }

    @container workspace (max-width: 43rem) {
      :global(.enrollment-actions) {
        grid-column: 1;
        justify-content: flex-start;
      }

      .sensor-facts {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
