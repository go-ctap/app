<script lang="ts">
  export let step = "1";
  export let title = "";
  export let active = false;
</script>

<section class:active class="step-panel">
  <div class="step-kicker">
    <span>{step}</span>
    <strong>{title}</strong>
  </div>
  <slot />
</section>
