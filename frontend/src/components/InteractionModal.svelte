<script lang="ts">
  import { api } from "../lib/api";
  import { pendingInteraction } from "../lib/stores";
  import DialogShell from "./DialogShell.svelte";

  let pin = "";

  $: prompt = $pendingInteraction;
  $: kind = prompt?.request?.kind || "confirm";
  $: destructive = Boolean(prompt?.request?.destructive);

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
    title={destructive ? "Confirm destructive operation" : "Authenticator needs you"}
    eyebrow={kind}
    destructive={destructive}
    on:primary={() => answer(true)}
    on:close={() => answer(false, true)}
  >
      <p>{prompt.request.message || "Continue on the authenticator to proceed."}</p>

      {#if prompt.request.permission}
        <p class="muted">Permission: {prompt.request.permission}</p>
      {/if}

      {#if prompt.request.preview}
        <pre class="preview">{JSON.stringify(prompt.request.preview, null, 2)}</pre>
      {/if}

      {#if kind === "pin"}
        <label>
          PIN
          <input bind:value={pin} type="password" autocomplete="off" />
        </label>
      {/if}

      <div class="actions" slot="actions">
        <button data-primary class:danger={destructive} type="button" on:click={() => answer(true)}>
          {kind === "pin" ? "Send PIN" : "Continue"}
        </button>
        <button class="quiet" type="button" on:click={() => answer(false, true)}>Cancel</button>
      </div>
  </DialogShell>
{/if}
