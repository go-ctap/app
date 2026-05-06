<script lang="ts">
  import { pretty } from "../lib/format";
  export let value: unknown;
  export let title = "Raw JSON";

  async function copy() {
    await navigator.clipboard?.writeText(pretty(value));
  }
</script>

<section class="json-view">
  <div class="section-heading">
    <h3>{title}</h3>
    <button class="quiet" type="button" on:click={copy}>Copy</button>
  </div>
  <pre>{pretty(value)}</pre>
</section>
