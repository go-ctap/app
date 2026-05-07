<script lang="ts">
  export let title = "Nothing here yet";
  export let message = "";
  export let eyebrow = "";
  export let variant: "default" | "compact" | "workspace" = "default";
</script>

<div class="empty-state" class:compact={variant === "compact"} class:workspace={variant === "workspace"}>
  <div class="empty-state-marker" aria-hidden="true"></div>
  <div class="empty-state-copy">
    {#if eyebrow}
      <p class="empty-state-eyebrow">{eyebrow}</p>
    {/if}
    <h2>{title}</h2>
    {#if message}
      <p>{message}</p>
    {/if}
  </div>
  {#if $$slots.actions}
    <div class="empty-state-actions">
      <slot name="actions" />
    </div>
  {/if}
</div>
