<script lang="ts">
  import NfcIcon from "@lucide/svelte/icons/nfc";

  import { m } from "../../../paraglide/messages.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { failureMessage } from "$lib/failure.js";
  import type { OperationRecoveryPresentation } from "$lib/operation-recovery.js";

  let {
    presentation,
    onCancel,
    onRetry,
  }: {
    presentation: OperationRecoveryPresentation | null;
    onCancel: () => void;
    onRetry: () => boolean;
  } = $props();

  let instruction = $derived.by(() => {
    if (!presentation) return "";
    if (presentation.mustRemove) return m.operation_recovery_remove_card();
    if (presentation.wrongDevice) return m.operation_recovery_wrong_device();
    if (!presentation.cardVisible) return m.operation_recovery_present_card();
    if (presentation.opening) return m.operation_recovery_opening_card();
    return m.operation_recovery_ready();
  });
</script>

{#if presentation}
  <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
    <Dialog.Content showCloseButton={false}>
      <Dialog.Header>
        <Dialog.Title>{m.operation_recovery_title()}</Dialog.Title>
        <Dialog.Description>
          {m.operation_recovery_description({ operation: presentation.label })}
        </Dialog.Description>
      </Dialog.Header>
      <Alert.Root variant={presentation.wrongDevice ? "warning" : "default"}>
        {#if presentation.opening}
          <Spinner aria-label={instruction} />
        {:else}
          <NfcIcon aria-hidden="true" />
        {/if}
        <Alert.Title>{instruction}</Alert.Title>
        <Alert.Description>
          {failureMessage(presentation.failure)} {m.operation_recovery_explicit_retry()}
        </Alert.Description>
      </Alert.Root>
      <Dialog.Footer>
        <Button variant="outline" type="button" onclick={onCancel}>{m.cancel()}</Button>
        <Button type="button" disabled={!presentation.canRetry} onclick={() => void onRetry()}>
          {m.retry()}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}
