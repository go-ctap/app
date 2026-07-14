<script lang="ts">
  import { InteractionKind } from "../../../../bindings/github.com/go-ctap/kit/model";
  import { InteractionAnswer } from "../../../../bindings/github.com/go-ctap/kit/service";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
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

  let pin = $state("");

  // Session close and device loss can dismiss a prompt without submitting it.
  $effect(() => {
    void presentation?.interactionId;
    pin = "";
  });

  async function answer(confirmed: boolean, canceled = false) {
    if (!presentation) return;
    if (confirmed && presentation.kind === InteractionKind.InteractionKindPIN && !pin) return;
    try {
      await onAnswer(new InteractionAnswer({
        interactionId: presentation.interactionId,
        ...(confirmed && presentation.kind === InteractionKind.InteractionKindPIN ? { pin } : {}),
        confirmed,
        canceled,
      }));
    } finally {
      pin = "";
    }
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    void answer(true);
  }
</script>

{#if presentation}
  <Dialog.Root open={true} onOpenChange={(open) => !open && void answer(false, true)}>
    <Dialog.Content class="interaction-dialog" showCloseButton={false}>
      <form class="interaction-dialog-form" onsubmit={submit}>
        <Dialog.Header>
          <Dialog.Title>{presentation.title}</Dialog.Title>
          <Dialog.Description>{presentation.message}</Dialog.Description>
        </Dialog.Header>

        {#if presentation.permission}
          <p class="muted">{m.permission({ permission: presentation.permission })}</p>
        {/if}

        {#if presentation.preview}
          <JsonView value={presentation.preview} title={m.preview_json()} variant="bare" />
        {/if}

        {#if presentation.kind === InteractionKind.InteractionKindPIN}
          <SensitivePinField bind:value={pin} label={m.pin()} autofocus />
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
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
@layer blocks {
    :global(.interaction-dialog) {
      width: min(32rem, calc(100% - 2rem));
      max-height: calc(100vh - 2rem);
      overflow: auto;
    }

    .interaction-dialog-form {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .muted {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
}
</style>
