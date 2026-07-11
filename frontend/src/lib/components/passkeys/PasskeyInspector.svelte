<script lang="ts">
  import { ChevronDown, Copy, Pencil, Trash2 } from "@lucide/svelte";

  import { copyToClipboard } from "$lib/clipboard";
  import JsonView from "$lib/components/shared/JsonView.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { PasskeysMutationState } from "$lib/features/passkeys/state";
  import type { PasskeyCredentialRow } from "$lib/passkeys-presentation";
  import { sanitizedJson } from "$lib/redaction";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: PasskeyCredentialRow;
    mutation: PasskeysMutationState;
    updateDisabled: boolean;
    deleteDisabled: boolean;
    previewOnly: boolean;
    onEdit: (credentialID: string) => void;
    onDelete: (credentialID: string) => void | Promise<boolean>;
  };

  let {
    row,
    mutation,
    updateDisabled,
    deleteDisabled,
    previewOnly,
    onEdit,
    onDelete,
  }: Props = $props();

  let deletingSelected = $derived(
    Boolean(
      mutation.kind === "delete" &&
      mutation.credentialIDHex === row.id &&
      mutation.phase === "previewing",
    ),
  );
  let rawJson = $derived(sanitizedJson(row.raw) ?? "null");

  function credProtectLabel(level: number | null) {
    if (level === 1) return m.cred_protect_level_1();
    if (level === 2) return m.cred_protect_level_2();
    if (level === 3) return m.cred_protect_level_3();
    return m.cred_protect_not_reported();
  }

  function compactCredProtectLabel(level: number | null) {
    return level ? `UV ${level}` : "UV —";
  }
</script>

<Tooltip.Provider delayDuration={350}>
  <section class="passkey-inspector" aria-labelledby={`passkey-details-${row.id}`}>
    <header class="passkey-inspector-header">
      <div class="passkey-inspector-heading">
        <h3 id={`passkey-details-${row.id}`}>{m.passkey_details()}</h3>
        <span>{row.rpName}</span>
      </div>

      <div class="passkey-inspector-actions">
        {#if previewOnly}
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <span {...props} class="passkey-disabled-action">
                  <Button variant="outline" size="sm" type="button" disabled>
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                    {m.edit()}
                  </Button>
                </span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="top">{m.preview_only()}</Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        {:else}
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={updateDisabled}
            onclick={() => onEdit(row.id)}
          >
            <Pencil data-icon="inline-start" aria-hidden="true" />
            {m.edit()}
          </Button>
        {/if}

        <Button
          variant="destructive"
          size="sm"
          type="button"
          disabled={deleteDisabled || deletingSelected}
          onclick={() => onDelete(row.id)}
        >
          {#if deletingSelected}
            <Spinner data-icon="inline-start" aria-hidden="true" />
          {:else}
            <Trash2 data-icon="inline-start" aria-hidden="true" />
          {/if}
          {m.delete()}
        </Button>
      </div>
    </header>

    <div class="passkey-inspector-content">
      <section class="passkey-detail-section" aria-labelledby={`passkey-user-title-${row.id}`}>
        <h4 id={`passkey-user-title-${row.id}`}>{m.user_name()}</h4>
        <dl class="passkey-detail-list">
          <div>
            <dt>{m.display_name()}</dt>
            <dd>{row.displayName}</dd>
          </div>
          <div>
            <dt>{m.user_name()}</dt>
            <dd>{row.userName}</dd>
          </div>
          <div>
            <dt>{m.user_id_hex()}</dt>
            <dd class="passkey-copy-value">
              <code>{row.userIDHex}</code>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      aria-label={m.copy_label({ label: m.user_id_hex() })}
                      disabled={!row.raw.credential.userIDHex}
                      onclick={() => copyToClipboard(row.userIDHex, m.user_id_copied())}
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top">{m.copy_label({ label: m.user_id_hex() })}</Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </dd>
          </div>
        </dl>
      </section>

      <section class="passkey-detail-section" aria-labelledby={`passkey-rp-title-${row.id}`}>
        <h4 id={`passkey-rp-title-${row.id}`}>{m.relying_parties()}</h4>
        <dl class="passkey-detail-list">
          <div>
            <dt>{m.rp_name()}</dt>
            <dd>{row.rpName}</dd>
          </div>
          <div>
            <dt>{m.credential_id()}</dt>
            <dd class="passkey-copy-value">
              <code>{row.credentialIDHex}</code>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      aria-label={m.copy_label({ label: m.credential_id() })}
                      onclick={() => copyToClipboard(row.credentialIDHex, m.credential_id_copied())}
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top">{m.copy_label({ label: m.credential_id() })}</Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </dd>
          </div>
          <div>
            <dt>{m.credential_type()}</dt>
            <dd>{row.credentialType}</dd>
          </div>
        </dl>
      </section>

      <section class="passkey-detail-section" aria-labelledby={`passkey-status-title-${row.id}`}>
        <h4 id={`passkey-status-title-${row.id}`}>{m.status()}</h4>
        <div class="passkey-cred-protect">
          <Badge
            variant="outline"
            aria-label={credProtectLabel(row.credProtectLevel)}
            title={credProtectLabel(row.credProtectLevel)}
          >
            {compactCredProtectLabel(row.credProtectLevel)}
          </Badge>
          <span>{credProtectLabel(row.credProtectLevel)}</span>
        </div>
        <div class="passkey-status-badges">
          <Badge variant="outline">
            {row.largeBlobKeyAvailable
              ? m.passkeys_filter_large_blob_available()
              : row.raw.credential.largeBlobKeyState === "missing"
                ? m.passkeys_filter_large_blob_missing()
                : m.not_reported()}
          </Badge>
          {#if row.thirdPartyPaymentEnabled}
            <Badge variant="outline">{m.third_party_payment()}</Badge>
          {/if}
        </div>
        <div class="passkey-transports">
          <span>{m.transport()}</span>
          {#if row.raw.credential.credentialTransports?.length}
            <div>
              {#each row.raw.credential.credentialTransports as transport (transport)}
                <Badge variant="outline">{transport}</Badge>
              {/each}
            </div>
          {:else}
            <strong>{m.not_reported()}</strong>
          {/if}
        </div>
      </section>

    </div>

    <Separator class="passkey-raw-separator" />

    <Collapsible.Root class="passkey-raw">
      <div class="passkey-raw-header">
        <Collapsible.Trigger
          class={buttonVariants({ variant: "ghost", size: "sm", class: "passkey-raw-trigger" })}
        >
          <span>{m.raw_credential_details()}</span>
          <ChevronDown class="passkey-raw-chevron" aria-hidden="true" />
        </Collapsible.Trigger>

        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label={m.copy_json()}
                onclick={() => copyToClipboard(rawJson, m.json_copied())}
              >
                <Copy data-icon="inline-start" aria-hidden="true" />
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="top">{m.copy_json()}</Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>

      <Collapsible.Content class="passkey-raw-content">
        <JsonView value={row.raw} variant="code" />
      </Collapsible.Content>
    </Collapsible.Root>
  </section>
</Tooltip.Provider>

<style>
@layer blocks {
  .passkey-inspector {
    display: grid;
    min-width: 0;
  }

  .passkey-inspector-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-3);
  }

  .passkey-inspector-heading {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
  }

  .passkey-inspector-heading h3 {
    margin: 0;
    font-size: 0.86rem;
  }

  .passkey-inspector-heading span {
    overflow: hidden;
    color: var(--muted-foreground);
    font-size: 0.72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .passkey-inspector-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .passkey-disabled-action {
    display: inline-flex;
  }

  .passkey-inspector-content,
  .passkey-detail-section,
  .passkey-detail-list,
  .passkey-status-badges,
  .passkey-cred-protect,
  .passkey-transports {
    min-width: 0;
  }

  .passkey-inspector-content {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
    padding: 0 var(--space-3) var(--space-3);
  }

  .passkey-detail-section {
    display: grid;
    align-content: start;
    gap: var(--space-2);
  }

  .passkey-detail-section h4 {
    margin: 0;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .passkey-detail-list {
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  .passkey-detail-list > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }

  .passkey-detail-list dt,
  .passkey-transports > span {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .passkey-detail-list dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .passkey-copy-value {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .passkey-copy-value code {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .passkey-status-badges,
  .passkey-cred-protect,
  .passkey-transports,
  .passkey-transports > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .passkey-cred-protect > span {
    min-width: 0;
    color: var(--muted-foreground);
    font-size: 0.72rem;
    overflow-wrap: anywhere;
  }

  :global(.passkey-raw) {
    display: grid;
    min-width: 0;
  }

  .passkey-raw-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    padding-right: var(--space-3);
  }

  :global(.passkey-raw-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: auto;
    min-width: 0;
    padding: var(--space-3);
    text-align: left;
  }

  :global(.passkey-raw-trigger span) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .passkey-raw-chevron {
    transition: transform 120ms ease;
  }

  :global(.passkey-raw-content) {
    min-width: 0;
    padding: 0 var(--space-3) var(--space-3);
  }

  @media (max-width: 900px) {
    .passkey-inspector-content {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

@layer exceptions {
  :global(.passkey-raw[data-state="open"] .passkey-raw-chevron) {
    transform: rotate(180deg);
  }
}
</style>
