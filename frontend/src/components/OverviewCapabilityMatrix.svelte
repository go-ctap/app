<script module lang="ts">
  import { Award, Boxes, Cpu, Database, FingerprintPattern, IdCard, Info, ListChecks, Puzzle, ShieldCheck, SlidersHorizontal } from "@lucide/svelte";

  const GROUP_ICONS: Record<string, typeof ShieldCheck> = {
    Identity: IdCard,
    Protocol: Cpu,
    Verification: FingerprintPattern,
    Storage: Database,
    Management: ListChecks,
    Policy: SlidersHorizontal,
    Extensions: Puzzle,
    Limits: Boxes,
    Attestation: Award,
  };
</script>

<script lang="ts">
  import { overviewStatusLabel, type OverviewGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

  let { groups = [], warningCount = 0 }: { groups?: OverviewGroup[]; warningCount?: number } = $props();
</script>

<section class="matrix-panel workbench-panel">
  <header class="workbench-panel__header">
    <div>
      <h2>{m.capability_matrix()}</h2>
      <p>{m.capability_matrix_description()}</p>
    </div>
    {#if warningCount}
      <span class="count-badge">{m.warnings_count({ count: warningCount })}</span>
    {/if}
  </header>

  <div class="workbench-table-frame">
    <table class="workbench-table">
      <thead>
        <tr>
          <th>{m.name()}</th>
          <th>{m.description()}</th>
          <th class="workbench-table__status">{m.status()}</th>
          <th>{m.value()}</th>
        </tr>
      </thead>
      <tbody>
        {#each groups as group (group.name)}
          {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
          <tr class="group-row">
            <td colspan="4">
              <span>
                <GroupIcon size={15} />
                {group.name}
              </span>
            </td>
          </tr>
          {#each group.rows as row (`${row.group}:${row.name}`)}
            <tr data-state={row.status === "unsupported" ? "muted" : undefined}>
              <td>
                <strong>{row.name}</strong>
                {#if row.source}
                  <small>{row.source}</small>
                {/if}
              </td>
              <td>{row.description}</td>
              <td class="workbench-table__status">
                <StatusBadge
                  value={row.status}
                  label={overviewStatusLabel(row.status)}
                  help={row.source || row.name}
                  tone={row.status === "unsupported" ? "neutral" : "auto"}
                />
              </td>
              <td><strong>{row.value || m.not_reported()}</strong></td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="4" class="empty-cell">{m.no_getinfo_fields_reported()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .matrix-panel {
    --table-min-width: 58rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1rem;
  }

  .count-badge {
    align-self: start;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-warning-bg);
    color: var(--color-warning);
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .group-row td {
    background: var(--color-panel-soft);
    color: var(--color-text);
    font-weight: 700;
  }

  .group-row span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  small {
    display: block;
    margin-top: var(--space-1);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
  }

  tr[data-state="muted"] {
    color: var(--color-text-muted);
  }

  .empty-cell {
    height: 6rem;
    color: var(--color-text-muted);
    text-align: center;
    vertical-align: middle;
  }
</style>
