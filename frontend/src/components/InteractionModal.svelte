<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { answerPendingInteraction } from "$lib/controller";
  import { pendingInteraction } from "$lib/stores";
  import DialogShell from "./DialogShell.svelte";
  import JsonView from "./JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  let pin = $state("");

  let prompt = $derived($pendingInteraction);
  let kind = $derived(prompt?.request?.kind || "confirm");
  let destructive = $derived(Boolean(prompt?.request?.destructive));

  async function answer(confirmed: boolean, canceled = false) {
    if (!prompt) return;
    try {
      await answerPendingInteraction({
        ...(confirmed && kind === "pin" ? { pin } : {}),
        confirmed,
        canceled,
      });
    } finally {
      pin = "";
    }
  }
</script>

{#if prompt}
  <DialogShell
    title={destructive ? m.confirm_destructive_operation() : m.authenticator_needs_you()}
    eyebrow={kind}
    destructive={destructive}
    primary={() => answer(true)}
    close={() => answer(false, true)}
  >
    <p>{prompt.request.message || m.continue_on_authenticator()}</p>

    {#if prompt.request.permission}
      <p class="muted">{m.permission({ permission: prompt.request.permission })}</p>
    {/if}

    {#if prompt.request.preview}
      <JsonView value={prompt.request.preview} title={m.preview_json()} variant="bare" />
    {/if}

    {#if kind === "pin"}
      <label class="field">
        <span>{m.pin()}</span>
        <input bind:value={pin} name="authenticator-pin" type="password" autocomplete="off" data-dialog-initial-focus />
      </label>
    {/if}

    {#snippet actions()}
      <div class="actions cluster">
        <Button variant={destructive ? "destructive" : "default"} data-primary type="button" onclick={() => answer(true)}>
          {kind === "pin" ? m.send_pin() : m.continue_action()}
        </Button>
        <Button variant="outline" type="button" onclick={() => answer(false, true)}>{m.cancel()}</Button>
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

    .field {
      display: grid;
      gap: var(--space-2);
      font-size: 0.875rem;
      font-weight: 700;
    }

    input {
      width: 100%;
    }

    .actions {
      --cluster-justify: flex-end;
    }

}
</style>
