<script lang="ts">
  import { Fingerprint, RotateCcw, Trash2 } from "@lucide/svelte";

  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import type { SecurityMutationState } from "$lib/features/security/state";
  import type { ActiveOperation } from "$lib/features/workbench/state";

  import { m } from "../../../paraglide/messages.js";
  import SecurityMutationDetails from "./SecurityMutationDetails.svelte";

  type Props = {
    mutation: SecurityMutationState;
    activeOperation: ActiveOperation | null;
    disabled: boolean;
    onConfirm: () => void | Promise<boolean>;
    onPreview: () => void | Promise<boolean>;
    onClose: () => void;
    onCancelOperation: () => void | Promise<void>;
  };

  let { mutation, activeOperation, disabled, onConfirm, onPreview, onClose, onCancelOperation }: Props = $props();

  let enrollmentRunning = $derived(
    mutation.kind === "bioEnroll" && mutation.phase === "executing",
  );
  let open = $derived(
    mutation.phase === "review" || mutation.phase === "error" || enrollmentRunning,
  );
  let destructive = $derived(mutation.kind === "bioRemove" || mutation.kind === "reset");
  let previewFailed = $derived(
    mutation.phase === "error" && mutation.failedPhase === "previewing",
  );
  let executionFailed = $derived(
    mutation.phase === "error" && mutation.failedPhase === "executing",
  );

  function title() {
    if (mutation.kind === "alwaysUv") return m.security_always_uv();
    if (mutation.kind === "pinPolicy") return m.security_pin_policy();
    if (mutation.kind === "longTouch") return m.security_long_touch_for_reset();
    if (mutation.kind === "bioEnroll") return m.security_enroll_biometric();
    if (mutation.kind === "bioRename") return m.security_rename_enrollment();
    if (mutation.kind === "bioRemove") return m.security_remove_enrollment();
    if (mutation.kind === "reset") return m.security_factory_reset();
    return m.security_mutation_preview();
  }

  function description(): string | undefined {
    if (mutation.kind === "reset") return m.security_factory_reset_description();
    if (mutation.kind === "bioRemove") return m.security_remove_enrollment_description();
    return undefined;
  }

  function confirmationLabel() {
    if (mutation.kind === "reset") return m.security_reset_confirm();
    if (mutation.kind === "bioRemove") return m.security_bio_remove_operation();
    if (mutation.kind === "bioEnroll") return m.security_bio_enroll_operation();
    if (mutation.kind === "bioRename") return m.security_bio_rename_operation();
    if (mutation.kind === "alwaysUv") return m.security_always_uv_operation();
    if (mutation.kind === "pinPolicy") return m.security_pin_policy_operation();
    if (mutation.kind === "longTouch") return m.security_long_touch_operation();
    return m.continue_action();
  }

  function previewLabel() {
    if (mutation.kind === "pinPolicy" || mutation.kind === "bioRename") {
      return m.preview_change();
    }
    return confirmationLabel();
  }

  function primaryLabel() {
    return previewFailed ? previewLabel() : confirmationLabel();
  }

  function runPrimary(event?: Event) {
    event?.preventDefault();
    if (mutation.phase === "review" || executionFailed) void onConfirm();
    else if (previewFailed) void onPreview();
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  function preventEnrollmentDismiss(event: Event) {
    if (enrollmentRunning) event.preventDefault();
  }
</script>

{#if destructive}
  <AlertDialog.Root {open} onOpenChange={handleOpenChange}>
    <AlertDialog.Content class="security-destructive-dialog">
      <ModalScrollArea>
        <AlertDialog.Header>
          <AlertDialog.Media>
            {#if mutation.kind === "reset"}<RotateCcw aria-hidden="true" />{:else}<Trash2 aria-hidden="true" />{/if}
          </AlertDialog.Media>
          <AlertDialog.Title>{title()}</AlertDialog.Title>
          {#if description()}
            <AlertDialog.Description>{description()}</AlertDialog.Description>
          {/if}
        </AlertDialog.Header>

        <SecurityMutationDetails {mutation} {activeOperation} />

        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={onClose}>{m.cancel()}</AlertDialog.Cancel>
          <AlertDialog.Action variant="destructive" disabled={disabled} onclick={runPrimary}>
            {primaryLabel()}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </ModalScrollArea>
    </AlertDialog.Content>
  </AlertDialog.Root>
{:else}
  <Dialog.Root {open} onOpenChange={handleOpenChange}>
    <Dialog.Content
      class="security-mutation-dialog"
      showCloseButton={!enrollmentRunning}
      onEscapeKeydown={preventEnrollmentDismiss}
      onInteractOutside={preventEnrollmentDismiss}
    >
      <ModalScrollArea>
        <Dialog.Header>
          <Dialog.Title>{title()}</Dialog.Title>
          {#if description()}
            <Dialog.Description>{description()}</Dialog.Description>
          {/if}
        </Dialog.Header>

        <SecurityMutationDetails {mutation} {activeOperation} />

        <Dialog.Footer>
          {#if enrollmentRunning}
            <Button variant="outline" type="button" onclick={() => void onCancelOperation()}>
              <Fingerprint data-icon="inline-start" aria-hidden="true" />
              {m.security_cancel_enrollment()}
            </Button>
          {:else}
            <Button type="button" disabled={disabled} onclick={runPrimary}>
              {primaryLabel()}
            </Button>
            <Button variant="outline" type="button" onclick={onClose}>{m.cancel()}</Button>
          {/if}
        </Dialog.Footer>
      </ModalScrollArea>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
@layer blocks {
  :global(.security-mutation-dialog),
  :global(.security-destructive-dialog) {
    width: min(38rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
  }
}
</style>
