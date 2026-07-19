<script lang="ts">
  import { RefreshCw, Sparkles } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";

  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import type { LargeBlobsPresentation } from "$lib/largeblobs-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: LargeBlobsPresentation;
    verificationFlow: VerificationFlow;
    onReload: () => void | Promise<boolean>;
    onCleanup: () => void | Promise<boolean>;
    onVerificationFlowChange: (flow: VerificationFlow) => void;
  };

  let {
    presentation,
    verificationFlow,
    onReload,
    onCleanup,
    onVerificationFlowChange,
  }: Props = $props();

  function getVerificationValue() {
    return verificationFlow === VerificationFlow.VerificationFlowPIN ? "pin" : "auto";
  }

  function handleVerificationChange(value: string | string[]) {
    if (Array.isArray(value) || !value) return;
    onVerificationFlowChange(
      value === "pin"
        ? VerificationFlow.VerificationFlowPIN
        : VerificationFlow.VerificationFlowDefault,
    );
  }

  function formatLastLoaded(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }
</script>

<Card.Root class="large-blobs-overview">
  <Card.Header>
    <Card.Title><h2 id="large-blobs-title">{m.large_blob_summary()}</h2></Card.Title>
    <Card.Description>
      <span>{presentation.selectedDeviceName}</span>
      {#if presentation.lastSuccessfulAt}
        <span aria-hidden="true">·</span>
        <span>
          {m.large_blobs_last_loaded({ time: formatLastLoaded(presentation.lastSuccessfulAt) })}
        </span>
      {/if}
    </Card.Description>
    <Card.Action>
      <Button
        variant="outline"
        type="button"
        onclick={onReload}
        disabled={presentation.reloadDisabled}
      >
        {#if presentation.loading}
          <Spinner data-icon="inline-start" aria-hidden="true" />
        {:else}
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {/if}
        {presentation.loading ? m.reloading_blobs() : m.reload_blobs()}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    <div class="large-blobs-overview-grid">
      <section class="large-blobs-overview-summary" aria-labelledby="large-blobs-credentials-title">
        <span id="large-blobs-credentials-title">{m.blob_credentials()}</span>
        {#if presentation.hasReport}
          <strong>{m.credentials_count({ count: presentation.credentialCount })}</strong>
          <div>
            <Badge variant="outline">{m.blobs_count({ count: presentation.blobCount })}</Badge>
            <Badge variant="outline">{m.matched_count({ count: presentation.matchedBlobCount })}</Badge>
            <Badge variant={presentation.unmatchedBlobCount > 0 ? "destructive" : "outline"}>
              {m.unmatched_count({ count: presentation.unmatchedBlobCount })}
            </Badge>
          </div>
        {:else}
          <strong>{m.not_reported()}</strong>
        {/if}
      </section>

      <section class="large-blobs-overview-summary" aria-labelledby="large-blobs-array-title">
        <span id="large-blobs-array-title">{m.serialized_array()}</span>
        {#if presentation.maxSerializedLargeBlobArray !== null}
          <strong>{m.bytes_count({ count: presentation.maxSerializedLargeBlobArray })}</strong>
        {:else}
          <strong>{m.capacity_not_reported()}</strong>
        {/if}
        <small>{m.matrix_name_serialized_large_blob_array_limit()}</small>
      </section>
    </div>

    <div class="large-blobs-overview-controls">
      <div class="large-blobs-capabilities" aria-label={m.support_mode()}>
        {#if presentation.support}
          {#each presentation.supportItems as item (item.label)}
            <StatusBadge
              label={`${item.label}: ${item.value ? m.state_available() : m.state_not_available()}`}
              tone={item.value ? "ok" : "neutral"}
            />
          {/each}
        {/if}
      </div>

      <div class="large-blobs-overview-actions">
        <Field.Field class="large-blobs-verification" orientation="horizontal">
          <Field.FieldTitle id="large-blobs-verification-label">{m.user_verification()}</Field.FieldTitle>
          <ToggleGroup.Root
            type="single"
            bind:value={getVerificationValue, handleVerificationChange}
            variant="outline"
            size="sm"
            aria-labelledby="large-blobs-verification-label"
            disabled={presentation.loading}
          >
            <ToggleGroup.Item value="auto" aria-label={m.verification_auto()}>
              {m.verification_auto()}
            </ToggleGroup.Item>
            <ToggleGroup.Item value="pin" aria-label={m.verification_pin()}>
              {m.verification_pin()}
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </Field.Field>

        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={presentation.cleanupDisabled}
          onclick={onCleanup}
        >
          <Sparkles data-icon="inline-start" aria-hidden="true" />
          {m.preview_cleanup()}
        </Button>
      </div>
    </div>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  :global(.large-blobs-overview) {
    min-width: 0;
  }

  :global(.large-blobs-overview [data-slot="card-title"] h2) {
    margin: 0;
    font: inherit;
  }

  :global(.large-blobs-overview [data-slot="card-description"]) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .large-blobs-overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }

  .large-blobs-overview-summary {
    display: grid;
    min-width: 0;
    gap: var(--space-2);
    align-content: start;
  }

  .large-blobs-overview-summary > span,
  :global(.large-blobs-verification [data-slot="field-title"]) {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .large-blobs-overview-summary strong {
    font-size: 1rem;
  }

  .large-blobs-overview-summary small {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .large-blobs-overview-summary div,
  .large-blobs-capabilities,
  :global(.large-blobs-verification),
  .large-blobs-overview-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .large-blobs-overview-controls {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }

  .large-blobs-overview-actions,
  :global(.large-blobs-verification) {
    justify-content: end;
  }

  @container workspace (max-width: 51.25rem) {
    .large-blobs-overview-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .large-blobs-overview-controls {
      align-items: start;
      flex-direction: column;
    }

    .large-blobs-overview-actions,
    :global(.large-blobs-verification) {
      justify-content: start;
    }
  }
}
</style>
