<script lang="ts">
  import type { Snippet } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";

  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";

  type Props = {
    stale: boolean;
    unsupported: boolean;
    hasReport: boolean;
    loading: boolean;
    reloadDisabled: boolean;
    staleTitle: string;
    staleMessage: string;
    unsupportedTitle: string;
    unsupportedMessage: string;
    notLoadedTitle: string;
    notLoadedMessage: string;
    loadLabel: string;
    iconContent: Snippet;
    inventoryContent: Snippet;
    onReload: () => void | Promise<boolean>;
  };

  let {
    stale,
    unsupported,
    hasReport,
    loading,
    reloadDisabled,
    staleTitle,
    staleMessage,
    unsupportedTitle,
    unsupportedMessage,
    notLoadedTitle,
    notLoadedMessage,
    loadLabel,
    iconContent,
    inventoryContent,
    onReload,
  }: Props = $props();
</script>

{#if stale}
  <Alert.Root variant="warning" role="alert" class="inventory-state-alert" data-state="stale">
    <TriangleAlert aria-hidden="true" />
    <Alert.Title>{staleTitle}</Alert.Title>
    <Alert.Description>{staleMessage}</Alert.Description>
  </Alert.Root>
{/if}

{#if unsupported}
  <EmptyState title={unsupportedTitle} message={unsupportedMessage} variant="compact">
    {#snippet icon()} {@render iconContent()} {/snippet}
  </EmptyState>
{:else if !hasReport && !loading}
  <EmptyState title={notLoadedTitle} message={notLoadedMessage} variant="compact">
    {#snippet icon()} {@render iconContent()} {/snippet}
    {#snippet actions()}
      <Button type="button" disabled={reloadDisabled} onclick={onReload}>{loadLabel}</Button>
    {/snippet}
  </EmptyState>
{:else}
  {@render inventoryContent()}
{/if}

<style>
@layer blocks {
  :global(.inventory-state-alert) {
    min-width: 0;
  }
}
</style>
