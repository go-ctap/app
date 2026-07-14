<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";

  import {
    MutationOperation,
    type MutationPreview,
  } from "../../../../bindings/github.com/go-ctap/kit/model/largeblobs";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    preview: MutationPreview;
  };

  let { preview }: Props = $props();

  let isCleanup = $derived(preview.operation === MutationOperation.MutationGC);
  let hasTarget = $derived(!isCleanup && Boolean(preview.target.credentialIDHex));
  let hasLimit = $derived(
    preview.serializedLargeBlobArrayLimit !== null
      && preview.serializedLargeBlobArrayLimit !== undefined,
  );

  function shown(value: string | undefined) {
    return value?.trim() || m.not_reported();
  }
</script>

<section class="large-blob-preview" aria-labelledby="large-blob-preview-title">
  <header class="large-blob-preview-heading">
    <h3 id="large-blob-preview-title">{m.mutation_preview()}</h3>
  </header>

  <div class="large-blob-preview-metrics" aria-label={m.large_blob_summary()}>
    <Badge variant="outline">
      {m.bytes_before({ count: preview.serializedLargeBlobArraySizeBefore })}
    </Badge>
    <Badge variant="outline">
      {m.bytes_after({ count: preview.serializedLargeBlobArraySizeAfter })}
    </Badge>
    {#if hasLimit}
      <Badge variant="outline">
        {m.serialized_array_limit({ count: preview.serializedLargeBlobArrayLimit ?? 0 })}
      </Badge>
    {/if}
    <Badge variant="outline">{m.blobs_before({ count: preview.blobCountBefore })}</Badge>
    <Badge variant="outline">{m.blobs_after({ count: preview.blobCountAfter })}</Badge>
    {#if isCleanup || preview.matchedBlobCount !== undefined}
      <Badge variant="outline">{m.matched_count({ count: preview.matchedBlobCount ?? 0 })}</Badge>
    {/if}
    {#if isCleanup || preview.unmatchedBlobCount !== undefined}
      <Badge variant={(preview.unmatchedBlobCount ?? 0) > 0 ? "destructive" : "outline"}>
        {m.unmatched_count({ count: preview.unmatchedBlobCount ?? 0 })}
      </Badge>
    {/if}
    {#if preview.deletedBlobCount !== undefined}
      <Badge variant="outline">{m.deleted_blobs_count({ count: preview.deletedBlobCount })}</Badge>
    {/if}
  </div>

  {#if hasTarget}
    <dl class="large-blob-preview-target">
      <div>
        <dt>{m.relying_parties()}</dt>
        <dd>{shown(preview.target.rp.name)} <code>{preview.target.rp.id}</code></dd>
      </div>
      <div>
        <dt>{m.user_name()}</dt>
        <dd>
          {shown(preview.target.user.displayName)}
          <span>{shown(preview.target.user.name)}</span>
        </dd>
      </div>
      <div>
        <dt>{m.credential_id()}</dt>
        <dd><code>{preview.target.credentialIDHex}</code></dd>
      </div>
      <div>
        <dt>{m.current_value()}</dt>
        <dd>{m.bytes_count({ count: preview.currentByteCount })}</dd>
      </div>
      <div>
        <dt>{m.proposed_value()}</dt>
        <dd>{m.bytes_count({ count: preview.proposedByteCount })}</dd>
      </div>
    </dl>
  {/if}

  {#if preview.warnings?.length}
    <div class="large-blob-preview-warnings" aria-label={m.preview_warnings()}>
      {#each preview.warnings as warning (warning.code)}
        <Alert.Root
          variant={warning.severity === "destructive"
            ? "destructive"
            : warning.severity === "warning"
              ? "warning"
              : "default"}
        >
          <Alert.Description>{warningMessage(warning)}</Alert.Description>
        </Alert.Root>
      {/each}
    </div>
  {/if}

  <Collapsible.Root class="large-blob-preview-json">
    <Collapsible.Trigger
      class={buttonVariants({ variant: "ghost", size: "sm", class: "large-blob-preview-json-trigger" })}
    >
      <span>{m.preview_json()}</span>
      <ChevronDown data-icon="inline-end" aria-hidden="true" />
    </Collapsible.Trigger>
    <Collapsible.Content class="large-blob-preview-json-content">
      <JsonView value={preview} variant="code" />
    </Collapsible.Content>
  </Collapsible.Root>
</section>

<style>
@layer blocks {
  .large-blob-preview,
  .large-blob-preview-warnings {
    display: grid;
    min-width: 0;
    gap: var(--space-3);
  }

  .large-blob-preview-heading h3 {
    margin: 0;
    font-size: 0.92rem;
  }

  .large-blob-preview-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .large-blob-preview-target {
    display: grid;
    min-width: 0;
    gap: var(--space-2);
    margin: 0;
    border: 1px solid var(--border);
    padding: var(--space-3);
  }

  .large-blob-preview-target > div {
    display: grid;
    grid-template-columns: minmax(7rem, 0.4fr) minmax(0, 1fr);
    gap: var(--space-2);
  }

  .large-blob-preview-target dt {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .large-blob-preview-target dd {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
    margin: 0;
    overflow-wrap: anywhere;
  }

  .large-blob-preview-target dd span {
    color: var(--muted-foreground);
  }

  :global(.large-blob-preview-json-trigger) {
    width: 100%;
    justify-content: space-between;
  }

  :global(.large-blob-preview-json) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  :global(.large-blob-preview-json-content) {
    display: grid;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding-top: var(--space-2);
  }
}
</style>
