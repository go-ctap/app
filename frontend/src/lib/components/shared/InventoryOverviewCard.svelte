<script lang="ts">
  import type { Snippet } from "svelte";
  import { RefreshCw } from "@lucide/svelte";

  import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";

  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Spinner } from "$lib/components/ui/spinner";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    titleID: string;
    title: string;
    selectedDeviceName: string;
    lastSuccessfulAt: string | null;
    lastLoadedLabel: (time: string) => string;
    loading: boolean;
    reloadDisabled: boolean;
    reloadLabel: string;
    reloadingLabel: string;
    verificationFlow: VerificationFlow;
    summary: Snippet;
    capabilities: Snippet;
    footer?: Snippet;
    onReload: () => void | Promise<boolean>;
    onVerificationFlowChange: (flow: VerificationFlow) => void;
  };

  let {
    titleID,
    title,
    selectedDeviceName,
    lastSuccessfulAt,
    lastLoadedLabel,
    loading,
    reloadDisabled,
    reloadLabel,
    reloadingLabel,
    verificationFlow,
    summary,
    capabilities,
    footer,
    onReload,
    onVerificationFlowChange,
  }: Props = $props();

  let formattedLastLoaded = $derived.by(() => {
    if (!lastSuccessfulAt) return null;

    const date = new Date(lastSuccessfulAt);
    const time = Number.isNaN(date.getTime())
      ? lastSuccessfulAt
      : new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(date);

    return lastLoadedLabel(time);
  });

  function handleVerificationChange(value: string | string[]) {
    if (Array.isArray(value) || !value) return;

    onVerificationFlowChange(
      value === "pin"
        ? VerificationFlow.VerificationFlowPIN
        : VerificationFlow.VerificationFlowDefault,
    );
  }
</script>

<Card.Root class="inventory-overview">
  <Card.Header>
    <Card.Title><h2 id={titleID}>{title}</h2></Card.Title>
    <Card.Description>
      <span>{selectedDeviceName}</span>
      {#if formattedLastLoaded}
        <span aria-hidden="true">·</span>
        <span>{formattedLastLoaded}</span>
      {/if}
    </Card.Description>
    <Card.Action>
      <Button variant="outline" type="button" onclick={onReload} disabled={reloadDisabled}>
        {#if loading}
          <Spinner data-icon="inline-start" aria-hidden="true" />
        {:else}
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
        {/if}
        {loading ? reloadingLabel : reloadLabel}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content>
    <div class="inventory-overview-summary">
      {@render summary()}
    </div>

    <div class="inventory-overview-controls">
      <div class="inventory-overview-capabilities">
        {@render capabilities()}
      </div>

      <div class="inventory-overview-verification">
        <span>{m.user_verification()}</span>
        <ToggleGroup.Root
          type="single"
          bind:value={
            () => (verificationFlow === VerificationFlow.VerificationFlowPIN ? "pin" : "auto"),
            handleVerificationChange
          }
          variant="outline"
          size="sm"
          aria-label={m.user_verification()}
          disabled={loading}
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

  {#if footer}
    <Card.Footer class="inventory-overview-footer">
      {@render footer()}
    </Card.Footer>
  {/if}
</Card.Root>

<style>
  @layer blocks {
    :global(.inventory-overview) {
      min-width: 0;
    }

    :global(.inventory-overview [data-slot="card-title"] h2) {
      margin: 0;
      font: inherit;
    }

    :global(.inventory-overview [data-slot="card-description"]) {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .inventory-overview-summary,
    .inventory-overview-controls,
    .inventory-overview-capabilities,
    .inventory-overview-verification {
      min-width: 0;
    }

    .inventory-overview-controls,
    .inventory-overview-capabilities,
    .inventory-overview-verification {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .inventory-overview-controls {
      align-items: end;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-3);
    }

    .inventory-overview-verification,
    :global(.inventory-overview-footer) {
      justify-content: end;
    }

    .inventory-overview-verification > span {
      color: var(--muted-foreground);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    @container workspace (max-width: 51.25rem) {
      .inventory-overview-controls {
        align-items: start;
        flex-direction: column;
      }

      .inventory-overview-verification {
        justify-content: start;
      }
    }
  }
</style>
