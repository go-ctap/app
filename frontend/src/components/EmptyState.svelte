<script lang="ts">
  export let title = "Nothing here yet";
  export let message = "";
</script>

<div class="empty-state">
  <h2>{title}</h2>
  {#if message}
    <p>{message}</p>
  {/if}
</div>
