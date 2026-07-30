<script lang="ts">
  import { Copy, Pencil, Trash2 } from "@lucide/svelte";

  import { copyToClipboard } from "$lib/clipboard";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { PasskeyCredentialRow } from "$lib/passkeys-presentation";
  import { advancedMode } from "$lib/preferences";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: PasskeyCredentialRow;
    updateDisabled: boolean;
    deleteDisabled: boolean;
    previewOnly: boolean;
    onEdit: (credentialID: string) => void;
    onDelete: (credentialID: string) => void | Promise<boolean>;
  };

  let { row, updateDisabled, deleteDisabled, previewOnly, onEdit, onDelete }: Props = $props();
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
            <Tooltip.Content side="top">{m.preview_only()}</Tooltip.Content>
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
          disabled={deleteDisabled}
          onclick={() => onDelete(row.id)}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
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
              <code title={row.userIDHex}>{row.userIDHex}</code>
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
                <Tooltip.Content side="top"
                  >{m.copy_label({ label: m.user_id_hex() })}</Tooltip.Content
                >
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
              <code title={row.credentialIDHex}>{row.credentialIDHex}</code>
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
                <Tooltip.Content side="top"
                  >{m.copy_label({ label: m.credential_id() })}</Tooltip.Content
                >
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
          <Badge variant="outline" aria-label={row.credProtect} title={row.credProtect}>
            {row.credProtectLevel ? `UV ${row.credProtectLevel}` : "UV —"}
          </Badge>
          <span>{row.credProtect}</span>
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

    {#if $advancedMode}
      <Separator class="passkey-raw-separator" />

      <div class="passkey-raw">
        <JsonDisclosure value={row.raw} title={m.raw_credential_details()} />
      </div>
    {/if}
  </section>
</Tooltip.Provider>

<style>
  @layer blocks {
    .passkey-inspector {
      contain: inline-size;
      display: grid;
      width: 100%;
      max-width: 100%;
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
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .passkey-raw {
      min-width: 0;
      padding: var(--space-3);
    }

    @container workspace (max-width: 56.25rem) {
      .passkey-inspector-content {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
