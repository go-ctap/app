<script lang="ts">
  import { api } from "../lib/api";
  import { pendingInteraction } from "../lib/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import DialogShell from "./DialogShell.svelte";
  import JsonView from "./JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  let pin = $state("");

  let prompt = $derived($pendingInteraction);
  let kind = $derived(prompt?.request?.kind || "confirm");
  let destructive = $derived(Boolean(prompt?.request?.destructive));

  async function answer(confirmed: boolean, canceled = false) {
    if (!prompt) return;
    await api.resolveInteraction({
      interactionId: prompt.interactionId,
      pin,
      confirmed,
      canceled,
    });
    pin = "";
    pendingInteraction.set(null);
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
        <p class="text-sm text-muted-foreground">{m.permission({ permission: prompt.request.permission })}</p>
      {/if}

      {#if prompt.request.preview}
        <JsonView value={prompt.request.preview} title={m.preview_json()} variant="bare" />
      {/if}

      {#if kind === "pin"}
        <Field.Field>
          <Field.Label>{m.pin()}</Field.Label>
          <Input bind:value={pin} type="password" autocomplete="off" />
        </Field.Field>
      {/if}

      {#snippet actions()}
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant={destructive ? "destructive" : "default"} onclick={() => answer(true)}>
          {kind === "pin" ? m.send_pin() : m.continue_action()}
        </Button>
        <Button variant="ghost" onclick={() => answer(false, true)}>{m.cancel()}</Button>
      </div>
      {/snippet}
  </DialogShell>
{/if}
