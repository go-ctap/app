<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let label = "Identifier";
  export let empty = "not reported";

  const dispatch = createEventDispatcher<{ copied: string }>();

  $: display = value || empty;

  async function copy() {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    dispatch("copied", value);
  }
</script>

<span class="copy-id">
  <span class="copy-id-label">{label}</span>
  <code title={display}>{display}</code>
  <button class="icon-button" type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} disabled={!value} on:click={copy}>Copy</button>
</span>
