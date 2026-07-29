<script lang="ts">
  import { m } from "../../../paraglide/messages.js";
</script>

<header class="lab-header">
  <h2 id="lab-scenario-title">{m.lab_scenario()}</h2>
  <p>{m.lab_description()}</p>
</header>

<style>
@layer blocks {
  .lab-header {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .lab-header h2,
  .lab-header p {
    margin: 0;
  }

  .lab-header h2 {
    font-size: 0.92rem;
  }

  .lab-header p {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }
}
</style>
