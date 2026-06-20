<script module lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
</script>

<script lang="ts">
  import type { OverviewConformanceWarning } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let { warnings = [] }: { warnings?: OverviewConformanceWarning[] } = $props();
</script>

{#if warnings.length}
  <section class="warning-panel">
    <header>
      <TriangleAlert size={18} />
      <div>
        <h2>{m.conformance_warnings()}</h2>
        <p>{m.conformance_warnings_description()}</p>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{m.warning()}</th>
            <th>{m.finding()}</th>
            <th>{m.source()}</th>
            <th>{m.description()}</th>
          </tr>
        </thead>
        <tbody>
          {#each warnings as warning (`${warning.name}:${warning.source}`)}
            <tr>
              <td><strong>{warning.name}</strong></td>
              <td><strong>{warning.value || m.not_reported()}</strong></td>
              <td><code>{warning.source}</code></td>
              <td>{warning.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}

<style>
  .warning-panel {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-panel);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
    padding: var(--space-4);
  }

  header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-3);
    align-items: start;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1rem;
  }

  p {
    color: color-mix(in srgb, var(--color-danger-text) 75%, var(--color-text-muted));
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .table-wrap {
    overflow: auto;
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-control);
    background: var(--color-panel);
  }

  table {
    width: 100%;
    min-width: 58rem;
    border-collapse: collapse;
    color: var(--color-text);
    font-size: 0.85rem;
  }

  th,
  td {
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-3);
    text-align: left;
    vertical-align: top;
  }

  th {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  code {
    overflow-wrap: anywhere;
  }
</style>
