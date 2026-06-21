<script lang="ts">
  import { m } from "../paraglide/messages.js";

  let { rows = [] }: { rows?: string[] } = $props();
</script>

<section class="loading-panel workbench-panel">
  <header class="workbench-panel__header">
    <h2>{m.inspection_in_progress()}</h2>
    <p>{m.reading_authenticator_metadata()}</p>
  </header>
  <table>
    <tbody>
      {#each rows as label (label)}
        <tr>
          <td>{label}</td>
          <td><span class="skeleton"></span></td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
@layer blocks {
    .loading-panel {
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1rem;
    }

    td:first-child {
      color: var(--color-text-muted);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      border-top: 1px solid var(--color-border);
      padding: var(--space-3) 0;
    }

    .skeleton {
      display: block;
      width: 8rem;
      height: 1rem;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--color-panel-soft), #e8eeee, var(--color-panel-soft));
      background-size: 200% 100%;
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      to {
        background-position: -200% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
}
</style>
