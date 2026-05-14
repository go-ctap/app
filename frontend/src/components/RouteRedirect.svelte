<script lang="ts">
  import { onMount } from "svelte";
  import { navigateToScreen, DEFAULT_WORKBENCH_SCREEN } from "$lib/navigation";

  onMount(() => {
    void navigateToScreen(DEFAULT_WORKBENCH_SCREEN, { replace: true });
  });
</script>

<div class="sr-only" aria-live="polite"></div>
