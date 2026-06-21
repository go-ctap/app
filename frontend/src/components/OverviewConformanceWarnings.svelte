<script module lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
</script>

<script lang="ts">
  import type { OverviewConformanceWarning } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  let { warnings = [] }: { warnings?: OverviewConformanceWarning[] } = $props();
</script>

{#if warnings.length}
  <section class="workbench-panel" data-tone="danger">
    <header class="workbench-panel__header" data-layout="icon">
      <TriangleAlert size={18} />
      <div>
        <h2>{m.conformance_warnings()}</h2>
        <p>{m.conformance_warnings_description()}</p>
      </div>
    </header>

    <div class="workbench-table-frame" data-tone="danger">
      <table class="workbench-table">
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
  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1rem;
  }

  code {
    overflow-wrap: anywhere;
  }
</style>
