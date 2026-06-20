<script lang="ts">
  import type { OverviewMDSObservation } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let { observations = [] }: { observations?: OverviewMDSObservation[] } = $props();

  function label(severity: OverviewMDSObservation["severity"]) {
    if (severity === "critical") return m.severity_critical();
    if (severity === "warning") return m.severity_warning();
    return m.severity_info();
  }
</script>

{#if observations.length}
  <details class="observations-panel">
    <summary>
      <span>{m.mds_observations_title()}</span>
      <span class="count">{m.items_count({ count: observations.length })}</span>
    </summary>
    <div class="content">
      <p>{m.mds_observations_description()}</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{m.severity()}</th>
              <th>{m.finding()}</th>
              <th>{m.token()}</th>
              <th>MDS</th>
              <th>{m.source()}</th>
              <th>{m.description()}</th>
            </tr>
          </thead>
          <tbody>
            {#each observations as observation (`${observation.severity}:${observation.source}:${observation.finding}`)}
              <tr>
                <td><span class="severity" data-severity={observation.severity}>{label(observation.severity)}</span></td>
                <td><strong>{observation.finding}</strong></td>
                <td><strong>{observation.token || m.not_reported()}</strong></td>
                <td><strong>{observation.mds || m.not_reported()}</strong></td>
                <td><code>{observation.source}</code></td>
                <td>{observation.description}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </details>
{/if}

<style>
  .observations-panel {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
  }

  summary {
    display: flex;
    cursor: pointer;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    font-weight: 700;
  }

  .count,
  .severity {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .content {
    display: grid;
    gap: var(--space-3);
    border-top: 1px solid var(--color-border);
    padding: var(--space-4);
  }

  p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .table-wrap {
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
  }

  table {
    width: 100%;
    min-width: 72rem;
    border-collapse: collapse;
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

  .severity[data-severity="critical"] {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  .severity[data-severity="warning"] {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }

  .severity[data-severity="info"] {
    color: var(--color-info);
  }

  code {
    overflow-wrap: anywhere;
  }
</style>
