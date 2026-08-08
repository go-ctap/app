<script lang="ts">
  import { Sparkles } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/telesma-app/kit";

  import InventoryOverviewCard from "$lib/components/shared/InventoryOverviewCard.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { LargeBlobsPresentation } from "$lib/largeblobs-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: LargeBlobsPresentation;
    verificationFlow: VerificationFlow;
    onReload: () => void | Promise<boolean>;
    onCleanup: () => void | Promise<boolean>;
    onVerificationFlowChange: (flow: VerificationFlow) => void;
  };

  let { presentation, verificationFlow, onReload, onCleanup, onVerificationFlowChange }: Props =
    $props();
</script>

<InventoryOverviewCard
  titleID="large-blobs-title"
  title={m.large_blob_summary()}
  selectedDeviceName={presentation.selectedDeviceName}
  lastSuccessfulAt={presentation.lastSuccessfulAt}
  lastLoadedLabel={(time) => m.large_blobs_last_loaded({ time })}
  loading={presentation.loading}
  reloadDisabled={presentation.reloadDisabled}
  reloadLabel={m.reload_blobs()}
  reloadingLabel={m.reloading_blobs()}
  {verificationFlow}
  {onReload}
  {onVerificationFlowChange}
>
  {#snippet summary()}
    <div class="large-blobs-overview-grid">
      <section class="large-blobs-overview-summary" aria-labelledby="large-blobs-entries-title">
        <span id="large-blobs-entries-title">{m.large_blob_entries()}</span>
        {#if presentation.hasReport}
          <strong>{m.large_blob_entries_count({ count: presentation.blobCount })}</strong>
          <div>
            <Badge variant="outline"
              >{m.matched_count({ count: presentation.matchedBlobCount })}</Badge
            >
            <Badge variant="outline">
              {m.large_blob_orphaned_count({ count: presentation.orphanedBlobCount })}
            </Badge>
            <Badge variant={presentation.nonconformingBlobCount > 0 ? "destructive" : "outline"}>
              {m.large_blob_nonconforming_count({
                count: presentation.nonconformingBlobCount,
              })}
            </Badge>
            <Badge variant={presentation.corruptBlobCount > 0 ? "destructive" : "outline"}>
              {m.large_blob_corrupt_count({ count: presentation.corruptBlobCount })}
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
  {/snippet}

  {#snippet capabilities()}
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
  {/snippet}

  {#snippet footer()}
    <Button
      variant="outline"
      size="sm"
      type="button"
      disabled={presentation.cleanupDisabled}
      onclick={onCleanup}
    >
      <Sparkles data-icon="inline-start" aria-hidden="true" />
      {m.cleanup()}
    </Button>
  {/snippet}
</InventoryOverviewCard>

<style>
  @layer blocks {
    .large-blobs-overview-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
      min-width: 0;
    }

    .large-blobs-overview-summary {
      display: grid;
      align-content: start;
      min-width: 0;
      gap: var(--space-2);
    }

    .large-blobs-overview-summary > span {
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
    .large-blobs-capabilities {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    @container workspace (max-width: 51.25rem) {
      .large-blobs-overview-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
