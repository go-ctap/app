<script lang="ts">
  import { pretty } from "../lib/format";
  export let value: unknown;
  export let title = "Raw JSON";
  export let variant: "card" | "bare" = "card";

  async function copy() {
    await navigator.clipboard?.writeText(pretty(value));
  }
</script>

<section class:json-view={variant === "card"} class:json-view-bare={variant === "bare"}>
  {#if variant === "card"}
    <div class="section-heading">
      <h3>{title}</h3>
      <button class="quiet" type="button" on:click={copy}>Copy</button>
    </div>
  {:else}
    <div class="bare-json-actions">
      <span>{title}</span>
      <button class="quiet compact" type="button" on:click={copy}>Copy</button>
    </div>
  {/if}
  <pre>{pretty(value)}</pre>
</section>
