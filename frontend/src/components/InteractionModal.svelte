<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import type { InteractionModalPresentation } from "$lib/shell-presentation";
  import DialogShell from "./DialogShell.svelte";
  import JsonView from "./JsonView.svelte";
  import SensitivePinField from "./SensitivePinField.svelte";
  import { m } from "../paraglide/messages.js";

  export type InteractionModalAnswer = {
    pin?: string;
    confirmed: boolean;
    canceled: boolean;
  };

  let {
    presentation,
    onAnswer,
  }: {
    presentation: InteractionModalPresentation | null;
    onAnswer: (answer: InteractionModalAnswer) => void | Promise<void>;
  } = $props();

  let pin = $state("");
  let submitting = $state(false);

  async function answer(confirmed: boolean, canceled = false) {
    if (!presentation || submitting) return;
    submitting = true;
    try {
      await onAnswer({
        ...(confirmed && presentation.kind === "pin" ? { pin } : {}),
        confirmed,
        canceled,
      });
    } finally {
      pin = "";
      submitting = false;
    }
  }
</script>

{#if presentation}
  <DialogShell
    title={presentation.title}
    eyebrow={presentation.eyebrow}
    destructive={presentation.destructive}
    primary={() => answer(true)}
    close={() => answer(false, true)}
  >
    <p>{presentation.message}</p>

    {#if presentation.permission}
      <p class="muted">{m.permission({ permission: presentation.permission })}</p>
    {/if}

    {#if presentation.preview}
      <JsonView value={presentation.preview} title={m.preview_json()} variant="bare" />
    {/if}

    {#if presentation.kind === "pin"}
      <SensitivePinField bind:value={pin} label={m.pin()} disabled={submitting} autofocus />
    {/if}

    {#snippet actions()}
      <div class="actions cluster">
        <Button variant={presentation.destructive ? "destructive" : "default"} data-primary type="button" disabled={submitting} onclick={() => answer(true)}>
          {presentation.kind === "pin" ? m.send_pin() : m.continue_action()}
        </Button>
        <Button variant="outline" type="button" disabled={submitting} onclick={() => answer(false, true)}>{m.cancel()}</Button>
      </div>
    {/snippet}
  </DialogShell>
{/if}

<style>
@layer blocks {
    .muted {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }

    .actions {
      --cluster-justify: flex-end;
    }

}
</style>
