<script lang="ts">
  import type { Snippet } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";
  import type { Failure } from "../../../../bindings/github.com/telesma-app/kit/model/failure";

  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import {
    confirmedFailureCanceled,
    confirmedFailureMessage,
  } from "$lib/confirmed-operation-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Operation =
    | { phase: "idle" | "editing" | "previewing" | "review" | "executing" | "success" }
    | {
        phase: "error";
        failedPhase: "previewing" | "executing";
        runtimeError: Failure | null;
        responseEnvelope: { error?: Failure | null } | null;
      };

  type Props = {
    operation: Operation;
    previewTitle: string;
    previewDescription?: string;
    previewCanceledTitle: string;
    operationCanceledTitle: string;
    confirmationTitle: string;
    confirmationDescription?: string;
    retryLabel: string;
    confirmLabel: string;
    confirmationContent?: Snippet;
    size?: "compact" | "wide";
    onRetry: () => void | Promise<boolean>;
    onConfirm: () => void | Promise<boolean>;
    onClose: () => void;
  };

  let {
    operation,
    previewTitle,
    previewDescription,
    previewCanceledTitle,
    operationCanceledTitle,
    confirmationTitle,
    confirmationDescription,
    retryLabel,
    confirmLabel,
    confirmationContent,
    size = "wide",
    onRetry,
    onConfirm,
    onClose,
  }: Props = $props();

  let previewErrorOpen = $derived(
    operation.phase === "error" && operation.failedPhase === "previewing",
  );

  let confirmationOpen = $derived(
    operation.phase === "review" ||
      (operation.phase === "error" && operation.failedPhase === "executing"),
  );

  let failureMessage = $derived.by(() => {
    if (operation.phase !== "error") return null;

    return confirmedFailureMessage(operation);
  });

  let failureCanceled = $derived(
    operation.phase === "error" && confirmedFailureCanceled(operation),
  );

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
          {#if previewDescription}
            <Dialog.Description>{previewDescription}</Dialog.Description>
          {/if}
        </Dialog.Header>

        <Alert.Root
          variant={failureCanceled ? "default" : "destructive"}
          role={failureCanceled ? "status" : "alert"}
        >
          <Alert.Title>{failureCanceled ? previewCanceledTitle : m.operation_failed()}</Alert.Title>
          <Alert.Description>{failureMessage}</Alert.Description>
        </Alert.Root>

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
          {#if confirmationDescription}
            <AlertDialog.Description>{confirmationDescription}</AlertDialog.Description>
          {/if}
        </AlertDialog.Header>

        {#if failureMessage}
          <Alert.Root
            variant={failureCanceled ? "default" : "destructive"}
            role={failureCanceled ? "status" : "alert"}
          >
            <Alert.Title
              >{failureCanceled ? operationCanceledTitle : m.operation_failed()}</Alert.Title
            >
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
