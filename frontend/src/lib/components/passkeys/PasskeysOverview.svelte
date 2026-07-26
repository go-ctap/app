<script lang="ts">
  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";

  import InventoryOverviewCard from "$lib/components/shared/InventoryOverviewCard.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import { Progress } from "$lib/components/ui/progress/index.js";
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
  let inventorySummary = $derived(presentation.report?.summary ?? null);
</script>

<InventoryOverviewCard
  titleID="passkeys-title"
  title={m.passkey_storage()}
  selectedDeviceName={presentation.selectedDeviceName}
  lastSuccessfulAt={presentation.lastSuccessfulAt}
  lastLoadedLabel={(time) => m.passkeys_last_loaded({ time })}
  loading={presentation.loading}
  reloadDisabled={presentation.reloadDisabled}
  reloadLabel={m.reload_credentials()}
  reloadingLabel={m.reloading_credentials()}
  {verificationFlow}
  {onReload}
  {onVerificationFlowChange}
>
  {#snippet summary()}
    <div class="passkeys-overview-grid">
      <section class="passkeys-inventory-summary" aria-labelledby="passkeys-inventory-title">
        <span class="sr-only" id="passkeys-inventory-title">{m.credential_inventory()}</span>
        {#if inventorySummary}
          <strong>{m.credentials_count({ count: inventorySummary.totalCredentials })}</strong>
          <small>{m.relying_parties_count({ count: inventorySummary.totalRPs })}</small>
        {:else}
          <strong>{m.not_reported()}</strong>
        {/if}
      </section>

      <section class="passkeys-capacity" aria-labelledby="passkeys-capacity-title">
        <div class="passkeys-capacity-heading">
          <span id="passkeys-capacity-title">{m.remaining_resident_capacity()}</span>
          <strong>{presentation.capacity?.remainingUpperBound ?? m.capacity_not_reported()}</strong>
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
  {/snippet}

  {#snippet capabilities()}
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
          label={`${m.permission_persistent_credential_management_read_only()}: ${support.readOnlyPermission ? m.status_supported() : m.state_not_available()}`}
          tone={support.readOnlyPermission ? "ok" : "neutral"}
        />
      {/if}
    </div>
  {/snippet}
</InventoryOverviewCard>

<style>
@layer blocks {
  .passkeys-overview-grid {
    display: grid;
    grid-template-columns: minmax(15rem, 0.75fr) minmax(18rem, 1.25fr);
    gap: var(--space-4);
    align-items: center;
    min-width: 0;
  }

  .passkeys-inventory-summary,
  .passkeys-capacity,
  .passkeys-capacity-heading {
    display: grid;
    align-content: center;
    min-width: 0;
  }

  .passkeys-inventory-summary,
  .passkeys-capacity {
    gap: var(--space-2);
  }

  .passkeys-capacity-heading {
    gap: var(--space-1);
  }

  .passkeys-capacity-heading span {
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

  .passkeys-capabilities {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  @container workspace (max-width: 51.25rem) {
    .passkeys-overview-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
