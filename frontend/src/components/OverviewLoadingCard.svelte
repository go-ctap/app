<script lang="ts">
  import { Card } from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { m } from "../paraglide/messages.js";

  let { rows = [] }: { rows?: string[] } = $props();
</script>

<Card class="loading-panel workbench-panel">
  <header class="workbench-panel__header">
    <h2>{m.inspection_in_progress()}</h2>
    <p>{m.reading_authenticator_metadata()}</p>
  </header>
  <table>
    <tbody>
      {#each rows as label (label)}
      <tr>
        <td>{label}</td>
        <td><Skeleton class="skeleton" /></td>
      </tr>
      {/each}
    </tbody>
  </table>
</Card>

<style>
@layer blocks {
    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1rem;
    }

    td:first-child {
      color: var(--muted-foreground);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      border-top: 1px solid var(--border);
      padding: var(--space-3) 0;
    }

    :global(.skeleton) {
      display: block;
      width: 8rem;
      height: 1rem;
    }

    @media (prefers-reduced-motion: reduce) {
      :global(.skeleton) {
        animation: none;
      }
    }
}
</style>
