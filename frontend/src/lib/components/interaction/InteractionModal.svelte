<script lang="ts">
  import { InteractionKind } from "../../../../bindings/github.com/go-ctap/kit/model";
  import { InteractionAnswer } from "../../../../bindings/telesma/service";

  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";
  import ModalScrollArea from "$lib/components/shared/ModalScrollArea.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { failureMessage } from "$lib/failure.js";
  import type { InteractionModalPresentation } from "$lib/shell-presentation";

  import { m } from "../../../paraglide/messages.js";
  import SensitivePinField from "./SensitivePinField.svelte";

  let {
    presentation,
    onAnswer,
  }: {
    presentation: InteractionModalPresentation | null;
    onAnswer: (answer: InteractionAnswer) => void | Promise<void>;
  } = $props();

  let pin = $derived.by(() => {
    presentation?.interactionId;
    return "";
  });

  async function answer(accepted: boolean, canceled = false) {
    if (!presentation) return;
    if (accepted && presentation.kind === InteractionKind.InteractionKindPIN && !pin) return;
    const pending = onAnswer(new InteractionAnswer({
      interactionId: presentation.interactionId,
      ...(accepted && presentation.kind === InteractionKind.InteractionKindPIN ? { pin } : {}),
      canceled,
    }));
    pin = "";
    await pending;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    void answer(true);
  }
</script>

{#if presentation}
  <Dialog.Root open={true} onOpenChange={(open) => !open && void answer(false, true)}>
    <Dialog.Content class="interaction-dialog" showCloseButton={false}>
      <ModalScrollArea>
        <form class="interaction-dialog-form" onsubmit={submit}>
          <Dialog.Header>
            <div class="interaction-heading">
              <div
                class="interaction-icon"
                data-prompt-visual
                data-destructive={presentation.destructive ? "true" : undefined}
                aria-hidden="true"
              >
                <presentation.icon />
              </div>
              <div class="interaction-heading-copy">
                <Dialog.Title>{presentation.title}</Dialog.Title>
                <Dialog.Description>{presentation.message}</Dialog.Description>
              </div>
            </div>
          </Dialog.Header>

        {#if presentation.permission}
          <p class="muted">{m.permission({ permission: presentation.permission })}</p>
        {/if}

        {#if presentation.preview}
          <JsonDisclosure value={presentation.preview} title={m.preview_json()} />
        {/if}

        {#if presentation.kind === InteractionKind.InteractionKindPIN}
          {#if presentation.pinState?.failure}
            <Alert.Root variant="destructive">
              <Alert.Title>{failureMessage(presentation.pinState.failure)}</Alert.Title>
              {#if presentation.pinState.retriesRemaining != null}
                <Alert.Description>
                  {m.interaction_pin_retries_remaining({ count: presentation.pinState.retriesRemaining })}
                </Alert.Description>
              {/if}
            </Alert.Root>
          {:else if presentation.pinState?.retriesRemaining != null}
            <p class="muted">
              {m.interaction_pin_retries_remaining({ count: presentation.pinState.retriesRemaining })}
            </p>
          {/if}

          {#if presentation.pinState?.powerCycleState === true}
            <Alert.Root variant="warning">
              <Alert.Title>{m.security_power_cycle_required()}</Alert.Title>
              <Alert.Description>{m.interaction_pin_power_cycle_required()}</Alert.Description>
            </Alert.Root>
          {/if}

          {#key presentation.interactionId}
            <SensitivePinField bind:value={pin} label={m.pin()} autofocus />
          {/key}
        {/if}

        <Dialog.Footer>
          <Button variant="outline" type="button" onclick={() => answer(false, true)}>{m.cancel()}</Button>
          <Button
            variant={presentation.destructive ? "destructive" : "default"}
            type="submit"
            disabled={presentation.kind === InteractionKind.InteractionKindPIN && !pin}
          >
            {presentation.kind === InteractionKind.InteractionKindPIN ? m.send_pin() : m.continue_action()}
          </Button>
        </Dialog.Footer>
        </form>
      </ModalScrollArea>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
@layer blocks {
    :global(.interaction-dialog) {
      width: min(32rem, calc(100% - 2rem));
      max-height: calc(100vh - 2rem);
      overflow: hidden;
    }

    .interaction-dialog-form {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .interaction-heading {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-3);
      align-items: start;
    }

    .interaction-heading-copy {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .interaction-icon {
      display: grid;
      width: 3rem;
      aspect-ratio: 1;
      place-items: center;
      border: 1px solid var(--border);
      background: var(--muted);
      color: var(--foreground);
    }

    .interaction-icon :global(svg) {
      width: 1.5rem;
      height: 1.5rem;
    }

    .interaction-icon[data-destructive="true"] {
      border-color: color-mix(in srgb, var(--destructive) 35%, var(--border));
      background: color-mix(in srgb, var(--destructive) 10%, var(--background));
      color: var(--destructive);
    }

    .muted {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
}
</style>
