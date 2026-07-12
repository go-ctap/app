<script lang="ts">
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
  let submitting = $state(false);

  async function answer(confirmed: boolean, canceled = false) {
    if (!presentation || submitting) return;
    submitting = true;
    try {
      await onAnswer(new InteractionAnswer({
        interactionId: presentation.interactionId,
        ...(confirmed && presentation.kind === "pin" ? { pin } : {}),
        confirmed,
        canceled,
      }));
    } finally {
      pin = "";
      submitting = false;
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
          {#if presentation.eyebrow}
            <p class="eyebrow">{presentation.eyebrow}</p>
          {/if}
          <Dialog.Title>{presentation.title}</Dialog.Title>
          <Dialog.Description>{presentation.message}</Dialog.Description>
        </Dialog.Header>

        {#if presentation.permission}
          <p class="muted">{m.permission({ permission: presentation.permission })}</p>
        {/if}

        {#if presentation.preview}
          <JsonView value={presentation.preview} title={m.preview_json()} variant="bare" />
        {/if}

        {#if presentation.kind === "pin"}
          <SensitivePinField bind:value={pin} label={m.pin()} disabled={submitting} autofocus />
        {/if}

        <Dialog.Footer>
          <Button variant="outline" type="button" disabled={submitting} onclick={() => answer(false, true)}>{m.cancel()}</Button>
          <Button variant={presentation.destructive ? "destructive" : "default"} type="submit" disabled={submitting}>
            {presentation.kind === "pin" ? m.send_pin() : m.continue_action()}
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

    .eyebrow,
    .muted {
      margin: 0;
      color: var(--muted-foreground);
    }

    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .muted {
      font-size: 0.875rem;
    }
}
</style>
