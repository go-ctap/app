<script lang="ts">
  import {
    Database,
    FilePenLine,
    FilePlus2,
    RefreshCw,
    Trash2,
    TriangleAlert,
  } from "@lucide/svelte";

  import { ReadState } from "../../../../bindings/github.com/telesma-app/kit/model/largeblobs";

  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import type { PasskeyLargeBlobState } from "$lib/features/largeblobs/state";
  import { failureMessage } from "$lib/failure";
  import type { PasskeyCredentialRow } from "$lib/passkeys-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: PasskeyCredentialRow;
    state: PasskeyLargeBlobState;
    disabled: boolean;
    onCheck: (credentialIDHex: string) => void | Promise<boolean>;
    onWrite: (credentialIDHex: string) => void;
    onDelete: (credentialIDHex: string) => void | Promise<boolean>;
  };

  let { row, state, disabled, onCheck, onWrite, onDelete }: Props = $props();

  let selectedState = $derived(
    state.phase !== "idle" && state.credentialIDHex === row.credentialIDHex ? state : null,
  );

  let ready = $derived(selectedState?.phase === "ready" ? selectedState : null);

  $effect(() => {
    if (!row.largeBlobKeyAvailable || disabled || selectedState !== null) return;

    void onCheck(row.credentialIDHex);
  });

  let readFailure = $derived.by(() => {
    if (selectedState?.phase !== "error") return "";

    return (
      failureMessage(selectedState.runtimeError) ??
      failureMessage(selectedState.responseEnvelope?.error) ??
      m.operation_failed()
    );
  });

  let badgeLabel = $derived.by(() => {
    if (!row.largeBlobKeyAvailable) {
      return row.raw.credential.largeBlobKeyState === "missing"
        ? m.passkeys_filter_large_blob_missing()
        : m.not_reported();
    }

    return m.passkeys_filter_large_blob_available();
  });

  let statusTitle = $derived.by(() => {
    if (!row.largeBlobKeyAvailable) return m.passkey_data_unavailable();
    if (!ready) return m.passkey_data_checking();
    if (ready?.state === ReadState.ReadStatePresent) {
      return m.bytes_count({ count: ready.rawByteCount });
    }
    if (ready?.state === ReadState.ReadStateMissing) return m.passkey_data_missing();

    return m.passkey_data_checking();
  });

  let statusMessage = $derived.by(() => {
    if (!row.largeBlobKeyAvailable) {
      return row.raw.credential.largeBlobKeyState === "missing"
        ? m.passkey_data_unavailable_message()
        : m.passkey_data_not_reported_message();
    }
    if (ready?.state === ReadState.ReadStatePresent) return m.passkey_associated_data_description();
    if (ready?.state === ReadState.ReadStateMissing) return m.passkey_data_missing_message();

    return "";
  });
</script>

<section
  class="passkey-large-blob-section"
  data-state={ready?.state ?? selectedState?.phase ?? "idle"}
  aria-labelledby={`passkey-associated-data-${row.id}`}
>
  <Separator />

  <div class="passkey-large-blob-content">
    <header class="passkey-large-blob-heading">
      <div>
        <h4 id={`passkey-associated-data-${row.id}`}>{m.passkey_associated_data()}</h4>
        <p>{m.passkey_associated_data_description()}</p>
      </div>
      <Badge variant={ready?.state === ReadState.ReadStatePresent ? "secondary" : "outline"}>
        {badgeLabel}
      </Badge>
    </header>

    {#if selectedState?.phase === "error"}
      <div class="passkey-large-blob-error">
        <Alert.Root variant="destructive" role="alert">
          <TriangleAlert aria-hidden="true" />
          <Alert.Title>{m.passkey_data_check_failed()}</Alert.Title>
          <Alert.Description>{readFailure}</Alert.Description>
        </Alert.Root>

        <Button
          variant="outline"
          size="sm"
          type="button"
          {disabled}
          onclick={() => onCheck(row.credentialIDHex)}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {m.retry()}
        </Button>
      </div>
    {:else}
      <div class="passkey-large-blob-state">
        <div class="passkey-large-blob-copy">
          <Database aria-hidden="true" />
          <span>
            <strong>{statusTitle}</strong>
            {#if statusMessage}<small>{statusMessage}</small>{/if}
          </span>
        </div>

        <div class="passkey-large-blob-actions">
          {#if row.largeBlobKeyAvailable && ready?.state === ReadState.ReadStatePresent}
            <Button
              variant="outline"
              size="sm"
              type="button"
              {disabled}
              onclick={() => onWrite(row.credentialIDHex)}
            >
              <FilePenLine data-icon="inline-start" aria-hidden="true" />
              {m.large_blob_replace_data()}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              {disabled}
              onclick={() => onDelete(row.credentialIDHex)}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              {m.delete()}
            </Button>
          {:else if row.largeBlobKeyAvailable && ready?.state === ReadState.ReadStateMissing}
            <Button size="sm" type="button" {disabled} onclick={() => onWrite(row.credentialIDHex)}>
              <FilePlus2 data-icon="inline-start" aria-hidden="true" />
              {m.large_blob_attach_data()}
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  @layer blocks {
    .passkey-large-blob-section,
    .passkey-large-blob-content,
    .passkey-large-blob-heading,
    .passkey-large-blob-state,
    .passkey-large-blob-error,
    .passkey-large-blob-copy,
    .passkey-large-blob-actions {
      min-width: 0;
    }

    .passkey-large-blob-section {
      display: grid;
    }

    .passkey-large-blob-content {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
    }

    .passkey-large-blob-heading,
    .passkey-large-blob-state,
    .passkey-large-blob-error,
    .passkey-large-blob-copy,
    .passkey-large-blob-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .passkey-large-blob-heading,
    .passkey-large-blob-state {
      justify-content: space-between;
    }

    .passkey-large-blob-heading > div,
    .passkey-large-blob-copy span {
      display: grid;
      min-width: 0;
      gap: var(--space-1);
    }

    .passkey-large-blob-heading h4 {
      margin: 0;
      font-size: 0.78rem;
      text-transform: uppercase;
    }

    .passkey-large-blob-heading p,
    .passkey-large-blob-copy small {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .passkey-large-blob-copy {
      flex: 1 1 18rem;
    }

    .passkey-large-blob-copy span {
      flex: 1 1 auto;
    }

    .passkey-large-blob-actions {
      justify-content: flex-end;
    }

    .passkey-large-blob-error {
      align-items: flex-end;
    }

    .passkey-large-blob-error :global([data-slot="alert"]) {
      flex: 1 1 20rem;
    }

    @container workspace (max-width: 38rem) {
      .passkey-large-blob-content {
        padding-inline: var(--space-4);
      }
    }
  }
</style>
