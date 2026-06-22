<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import type { InteractionModalModel } from "$lib/shell-view-model";
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
    model,
    onAnswer,
  }: {
    model: InteractionModalModel | null;
    onAnswer: (answer: InteractionModalAnswer) => void | Promise<void>;
  } = $props();

  let pin = $state("");
  let submitting = $state(false);

  async function answer(confirmed: boolean, canceled = false) {
    if (!model || submitting) return;
    submitting = true;
    try {
      await onAnswer({
        ...(confirmed && model.kind === "pin" ? { pin } : {}),
        confirmed,
        canceled,
      });
    } finally {
      pin = "";
      submitting = false;
    }
  }
</script>

{#if model}
  <DialogShell
    title={model.title}
    eyebrow={model.eyebrow}
    destructive={model.destructive}
    primary={() => answer(true)}
    close={() => answer(false, true)}
  >
    <p>{model.message}</p>

    {#if model.permission}
      <p class="muted">{m.permission({ permission: model.permission })}</p>
    {/if}

    {#if model.preview}
      <JsonView value={model.preview} title={m.preview_json()} variant="bare" />
    {/if}

    {#if model.kind === "pin"}
      <SensitivePinField bind:value={pin} label={m.pin()} disabled={submitting} autofocus />
    {/if}

    {#snippet actions()}
      <div class="actions cluster">
        <Button variant={model.destructive ? "destructive" : "default"} data-primary type="button" disabled={submitting} onclick={() => answer(true)}>
          {model.kind === "pin" ? m.send_pin() : m.continue_action()}
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
