<script lang="ts">
  import type { Snippet } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";

  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    previewErrorOpen: boolean;
    confirmationOpen: boolean;
    previewTitle: string;
    previewCanceledTitle: string;
    operationCanceledTitle: string;
    confirmationTitle: string;
    retryLabel: string;
    confirmLabel: string;
    failureMessage: string | null;
    failureCanceled: boolean;
    previewContent?: Snippet;
    confirmationContent?: Snippet;
    size?: "compact" | "wide";
    onRetry: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let {
    previewErrorOpen,
    confirmationOpen,
    previewTitle,
    previewCanceledTitle,
    operationCanceledTitle,
    confirmationTitle,
    retryLabel,
    confirmLabel,
    failureMessage,
    failureCanceled,
    previewContent,
    confirmationContent,
    size = "wide",
    onRetry,
    onConfirm,
    onClose,
  }: Props = $props();

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  function handleAction(event: MouseEvent) {
    event.preventDefault();
    void onConfirm();
  }
</script>

<Dialog.Root open={previewErrorOpen} onOpenChange={handleOpenChange}>
  {#if previewErrorOpen}
    <Dialog.Content class="mutation-preview-error-dialog" data-size={size}>
      <ModalScrollArea>
        <Dialog.Header>
          <Dialog.Title>{previewTitle}</Dialog.Title>
        </Dialog.Header>

        <Alert.Root
          variant={failureCanceled ? "default" : "destructive"}
          role={failureCanceled ? "status" : "alert"}
        >
          <Alert.Title>{failureCanceled ? previewCanceledTitle : m.operation_failed()}</Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>

        {#if previewContent}{@render previewContent()}{/if}

        <Dialog.Footer>
          <Button type="button" onclick={() => void onRetry()}>{retryLabel}</Button>
          <Button variant="outline" type="button" onclick={onClose}>{m.close()}</Button>
        </Dialog.Footer>
      </ModalScrollArea>
    </Dialog.Content>
  {/if}
</Dialog.Root>

<AlertDialog.Root open={confirmationOpen} onOpenChange={handleOpenChange}>
  {#if confirmationOpen}
    <AlertDialog.Content class="destructive-mutation-dialog" data-size={size}>
      <ModalScrollArea>
        <AlertDialog.Header>
          <AlertDialog.Media><TriangleAlert aria-hidden="true" /></AlertDialog.Media>
          <AlertDialog.Title>{confirmationTitle}</AlertDialog.Title>
        </AlertDialog.Header>

        {#if failureMessage}
          <Alert.Root
            variant={failureCanceled ? "default" : "destructive"}
            role={failureCanceled ? "status" : "alert"}
          >
            <Alert.Title>{failureCanceled ? operationCanceledTitle : m.operation_failed()}</Alert.Title>
            <Alert.Description>{failureMessage}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if confirmationContent}{@render confirmationContent()}{/if}

        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={onClose}>{m.cancel()}</AlertDialog.Cancel>
          <AlertDialog.Action variant="destructive" onclick={handleAction}>
            {confirmLabel}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </ModalScrollArea>
    </AlertDialog.Content>
  {/if}
</AlertDialog.Root>

<style>
@layer blocks {
  :global(.mutation-preview-error-dialog),
  :global(.destructive-mutation-dialog) {
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
  }

  :global(.mutation-preview-error-dialog[data-size="compact"]) {
    width: min(30rem, calc(100vw - 2rem));
  }

  :global(.destructive-mutation-dialog[data-size="compact"]) {
    width: min(34rem, calc(100vw - 2rem));
  }

  :global(.mutation-preview-error-dialog[data-size="wide"]),
  :global(.destructive-mutation-dialog[data-size="wide"]) {
    width: min(42rem, calc(100vw - 2rem));
  }
}
</style>
