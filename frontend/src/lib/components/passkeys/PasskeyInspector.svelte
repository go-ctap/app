<script lang="ts">
  import { Copy } from "@lucide/svelte";

  import { copyToClipboard } from "$lib/clipboard";
  import PasskeyLargeBlobSection from "$lib/components/passkeys/PasskeyLargeBlobSection.svelte";
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { PasskeyLargeBlobState } from "$lib/features/largeblobs/state";
  import type { PasskeyCredentialRow } from "$lib/passkeys-presentation";
  import { advancedMode } from "$lib/preferences";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    row: PasskeyCredentialRow;
    credentials: PasskeyCredentialRow[];
    largeBlobState: PasskeyLargeBlobState;
    largeBlobDisabled: boolean;
    onSelect: (credentialID: string) => void;
    onLargeBlobCheck: (credentialID: string) => void | Promise<boolean>;
    onLargeBlobWrite: (credentialID: string) => void;
    onLargeBlobDelete: (credentialID: string) => void | Promise<boolean>;
  };

  let {
    row,
    credentials,
    largeBlobState,
    largeBlobDisabled,
    onSelect,
    onLargeBlobCheck,
    onLargeBlobWrite,
    onLargeBlobDelete,
  }: Props = $props();

  let credentialOptions = $derived(
    credentials.map((credential) => ({
      value: credential.id,
      label: `${credential.displayName} · ${credential.userName}`,
    })),
  );
  let credentialPosition = $derived(
    Math.max(1, credentials.findIndex((credential) => credential.id === row.id) + 1),
  );

  function handleCredentialChange(value: string | string[]) {
    if (!Array.isArray(value)) onSelect(value);
  }

  function compactCredentialID(value: string) {
    if (value.length <= 32) return value;

    return `${value.slice(0, 20)}…${value.slice(-8)}`;
  }
</script>

<Tooltip.Provider delayDuration={350}>
  <article class="passkey-inspector" aria-label={m.passkey_details()}>
    <header class="passkey-inspector-header">
      {#if credentials.length === 1}
        <div class="passkey-inspector-identity">
          <span>{m.passkey_credential()}</span>
          <h3>{row.displayName}</h3>
          <small>{row.userName}</small>
        </div>
      {:else}
        <div class="passkey-inspector-identity" data-multiple>
          <span>
            {m.passkeys_credential_position({
              current: credentialPosition,
              total: credentials.length,
            })}
          </span>
          <Select.Root
            type="single"
            value={row.id}
            onValueChange={handleCredentialChange}
            items={credentialOptions}
          >
            <Select.Trigger aria-label={m.passkeys_select_credential()}>
              {row.displayName} · {row.userName}
            </Select.Trigger>
            <Select.Content side="bottom" align="start" sideOffset={6}>
              <Select.Group>
                {#each credentialOptions as credential (credential.value)}
                  <Select.Item value={credential.value} label={credential.label}>
                    {credential.label}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
          <small>{m.passkeys_select_credential_hint()}</small>
        </div>
      {/if}

      <div class="passkey-inspector-credential-id">
        <span>{m.credential_id()}</span>
        <div class="passkey-copy-value">
          <code title={row.credentialIDHex}>{compactCredentialID(row.credentialIDHex)}</code>
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
            <Tooltip.Content side="top">
              {m.copy_label({ label: m.credential_id() })}
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
    </header>

    <div class="passkey-inspector-content">
      <section class="passkey-detail-section" aria-labelledby={`passkey-user-title-${row.id}`}>
        <h4 id={`passkey-user-title-${row.id}`}>{m.passkey_user()}</h4>

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
            <dt>{m.user_id()}</dt>
            <dd class="passkey-copy-value">
              {#if row.userIDEncoding === "hex"}
                <code title={row.userIDHex}>{row.userID}</code>
              {:else}
                <span title={row.userID}>{row.userID}</span>
              {/if}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      aria-label={m.copy_label({ label: m.user_id() })}
                      disabled={row.userIDEncoding === "unavailable"}
                      onclick={() => copyToClipboard(row.userID, m.user_id_copied())}
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="top">
                  {m.copy_label({ label: m.user_id() })}
                </Tooltip.Content>
              </Tooltip.Root>
            </dd>
          </div>
        </dl>
      </section>

      <section
        class="passkey-detail-section"
        aria-labelledby={`passkey-credential-title-${row.id}`}
      >
        <h4 id={`passkey-credential-title-${row.id}`}>{m.passkey_credential()}</h4>

        <dl class="passkey-detail-list">
          <div>
            <dt>{m.credential_type()}</dt>
            <dd>{row.credentialType}</dd>
          </div>

          <div>
            <dt>{m.transport()}</dt>
            <dd class="passkey-transports">
              {#if row.raw.credential.credentialTransports?.length}
                {#each row.raw.credential.credentialTransports as transport (transport)}
                  <Badge variant="outline">{transport}</Badge>
                {/each}
              {:else}
                {m.not_reported()}
              {/if}
            </dd>
          </div>
        </dl>
      </section>

      <section
        class="passkey-detail-section passkey-protection"
        aria-labelledby={`passkey-protection-title-${row.id}`}
      >
        <h4 id={`passkey-protection-title-${row.id}`}>{m.passkey_protection()}</h4>

        <div class="passkey-cred-protect">
          <Badge variant="outline" aria-label={row.credProtect} title={row.credProtect}>
            {row.credProtectLevel ? `UV ${row.credProtectLevel}` : "UV —"}
          </Badge>
          <small>{row.credProtect}</small>
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
      </section>
    </div>

    <PasskeyLargeBlobSection
      {row}
      state={largeBlobState}
      disabled={largeBlobDisabled}
      onCheck={onLargeBlobCheck}
      onWrite={onLargeBlobWrite}
      onDelete={onLargeBlobDelete}
    />

    {#if $advancedMode}
      <Separator class="passkey-raw-separator" />

      <div class="passkey-raw">
        <JsonDisclosure value={row.raw} title={m.raw_credential_details()} />
      </div>
    {/if}
  </article>
</Tooltip.Provider>

<style>
  @layer blocks {
    .passkey-inspector,
    .passkey-inspector-header,
    .passkey-inspector-identity,
    .passkey-inspector-credential-id,
    .passkey-inspector-content,
    .passkey-detail-section,
    .passkey-detail-list,
    .passkey-copy-value,
    .passkey-transports,
    .passkey-cred-protect,
    .passkey-status-badges,
    .passkey-raw {
      min-width: 0;
    }
    .passkey-inspector {
      contain: inline-size;
      display: grid;
      width: 100%;
      max-width: 100%;
    }

    .passkey-inspector-header {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
      gap: var(--space-5) var(--space-6);
      padding: var(--space-5);
    }

    .passkey-inspector-identity {
      grid-column: span 2;
      display: grid;
      gap: 3px;
    }

    .passkey-inspector-identity > span,
    .passkey-inspector-credential-id > span,
    .passkey-detail-section h4 {
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .passkey-inspector-identity h3 {
      margin: 0;
      overflow: hidden;
      font-size: 1rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .passkey-inspector-identity small,
    .passkey-cred-protect small {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .passkey-inspector-identity[data-multiple] :global([data-slot="select-trigger"]) {
      width: min(100%, 28rem);
      background: var(--muted);
    }

    .passkey-inspector-credential-id {
      grid-column: 3;
      display: grid;
      gap: 3px;
    }

    .passkey-inspector-credential-id .passkey-copy-value {
      max-width: 100%;
    }

    .passkey-transports,
    .passkey-cred-protect,
    .passkey-status-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .passkey-copy-value {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-2);
    }

    .passkey-inspector-content {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-5) var(--space-6);
      border-top: 1px solid var(--data-table-border);
      padding: var(--space-4) var(--space-5) var(--space-5);
    }

    .passkey-detail-section,
    .passkey-detail-list {
      display: grid;
      align-content: start;
    }

    .passkey-detail-section {
      gap: var(--space-3);
    }

    .passkey-detail-section h4 {
      margin: 0;
      color: var(--foreground);
    }

    .passkey-detail-list {
      gap: var(--space-3);
      margin: 0;
    }

    .passkey-detail-list > div {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .passkey-detail-list dt {
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

    .passkey-copy-value code,
    .passkey-copy-value > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .passkey-cred-protect {
      align-items: flex-start;
    }

    .passkey-cred-protect small {
      flex: 1 1 10rem;
      overflow-wrap: anywhere;
    }

    .passkey-raw {
      padding: var(--space-4) var(--space-5) var(--space-5);
    }

    @container workspace (max-width: 56rem) {
      .passkey-inspector-header {
        grid-template-columns: minmax(0, 1.35fr) minmax(15rem, 1fr);
      }

      .passkey-inspector-identity {
        grid-column: 1;
      }

      .passkey-inspector-credential-id {
        grid-column: 2;
      }

      .passkey-inspector-content {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @container workspace (max-width: 38rem) {
      .passkey-inspector-header,
      .passkey-inspector-content,
      .passkey-raw {
        padding-inline: var(--space-4);
      }

      .passkey-inspector-credential-id {
        grid-column: 1;
      }

      .passkey-inspector-header {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
