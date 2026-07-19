<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";

  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import type { PasskeysPresentation } from "$lib/passkeys-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: PasskeysPresentation;
    verificationFlow: VerificationFlow;
    onReload: () => void | Promise<boolean>;
    onVerificationFlowChange: (flow: VerificationFlow) => void;
  };

  let { presentation, verificationFlow, onReload, onVerificationFlowChange }: Props = $props();

  let support = $derived(presentation.report?.support ?? null);
  let summary = $derived(presentation.report?.summary ?? null);

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

<Card.Root class="passkeys-overview">
  <Card.Header>
    <Card.Title><h2 id="passkeys-title">{m.passkey_storage()}</h2></Card.Title>
    <Card.Description>
      <span>{presentation.selectedDeviceName}</span>
      {#if presentation.lastSuccessfulAt}
        <span aria-hidden="true">·</span>
        <span>{m.passkeys_last_loaded({ time: formatLastLoaded(presentation.lastSuccessfulAt) })}</span>
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
        {presentation.loading ? m.reloading_credentials() : m.reload_credentials()}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    <div class="passkeys-overview-grid">
      <section class="passkeys-inventory-summary" aria-labelledby="passkeys-inventory-title">
        <span class="sr-only" id="passkeys-inventory-title">{m.credential_inventory()}</span>
        {#if summary}
          <strong>{m.credentials_count({ count: summary.totalCredentials })}</strong>
          <small>{m.relying_parties_count({ count: summary.totalRPs })}</small>
        {:else}
          <strong>{m.not_reported()}</strong>
        {/if}
      </section>

      <section class="passkeys-capacity" aria-labelledby="passkeys-capacity-title">
        <div class="passkeys-capacity-heading">
          <span id="passkeys-capacity-title">{m.remaining_resident_capacity()}</span>
          <strong>
            {presentation.capacity?.remainingUpperBound ?? m.capacity_not_reported()}
          </strong>
        </div>
        {#if presentation.capacity}
          <Progress
            value={presentation.capacity.percentage}
            aria-label={m.passkeys_capacity_summary({
              stored: presentation.capacity.stored,
              remaining: presentation.capacity.remainingUpperBound,
            })}
          />
        {/if}
      </section>
    </div>

    <div class="passkeys-overview-controls">
      <div class="passkeys-capabilities" aria-label={m.support_mode()}>
        {#if support}
          <StatusBadge
            label={`${m.credential_management_support()}: ${support.credentialManagement ? m.state_available() : m.state_not_available()}`}
            tone={support.credentialManagement ? "ok" : "neutral"}
          />
          <StatusBadge
            label={support.previewOnly ? m.passkeys_protocol_preview() : m.passkeys_protocol_stable()}
            tone={support.previewOnly ? "warn" : "neutral"}
          />
          <StatusBadge
            label={`${m.read_only_permission()}: ${support.readOnlyPermission ? m.state_available() : m.state_not_available()}`}
            tone="neutral"
          />
        {/if}
      </div>

      <div class="passkeys-verification">
        <span>{m.user_verification()}</span>
        <ToggleGroup.Root
          type="single"
          bind:value={getVerificationValue, handleVerificationChange}
          variant="outline"
          size="sm"
          aria-label={m.user_verification()}
          disabled={presentation.loading}
        >
          <ToggleGroup.Item value="auto" aria-label={m.verification_auto()}>
            {m.verification_auto()}
          </ToggleGroup.Item>
          <ToggleGroup.Item value="pin" aria-label={m.verification_pin()}>
            {m.verification_pin()}
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
    </div>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
  :global(.passkeys-overview) {
    min-width: 0;
  }

  :global(.passkeys-overview [data-slot="card-title"] h2) {
    margin: 0;
    font: inherit;
  }

  :global(.passkeys-overview [data-slot="card-description"]) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .passkeys-overview-grid,
  .passkeys-overview-controls,
  .passkeys-inventory-summary,
  .passkeys-capabilities,
  .passkeys-verification,
  .passkeys-capacity-heading {
    min-width: 0;
  }

  .passkeys-overview-grid {
    display: grid;
    grid-template-columns: minmax(15rem, 0.75fr) minmax(18rem, 1.25fr);
    gap: var(--space-4);
    align-items: center;
  }

  .passkeys-inventory-summary,
  .passkeys-capacity {
    display: grid;
    gap: var(--space-2);
    align-content: center;
  }

  .passkeys-capacity-heading span,
  .passkeys-verification > span {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .passkeys-inventory-summary strong,
  .passkeys-capacity-heading strong {
    font-size: 1rem;
  }

  .passkeys-inventory-summary small {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .passkeys-capacity-heading {
    display: grid;
    gap: var(--space-1);
  }

  .passkeys-overview-controls {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }

  .passkeys-capabilities,
  .passkeys-verification {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .passkeys-verification {
    justify-content: end;
  }

  @container workspace (max-width: 51.25rem) {
    .passkeys-overview-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .passkeys-overview-controls {
      align-items: start;
      flex-direction: column;
    }

    .passkeys-verification {
      justify-content: start;
    }
  }
}
</style>
