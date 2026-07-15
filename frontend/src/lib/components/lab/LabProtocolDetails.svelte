<script lang="ts" module>
  export type ProtocolDetailRow = {
    id: string;
    label: string;
    kind: "json" | "hex";
    type: string;
    byteCount: number;
    value: unknown;
  };
</script>

<script lang="ts">
  import { Eye } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    rows: ProtocolDetailRow[];
    onView: (row: ProtocolDetailRow) => void;
  };

  let { rows, onView }: Props = $props();
</script>

<Collapsible.Root class="lab-protocol-details">
  <Collapsible.Trigger class="lab-protocol-trigger">
    <span>{m.lab_technical_details()}</span>
    <span>{rows.length}</span>
  </Collapsible.Trigger>
  <Collapsible.Content>
    <div class="lab-protocol-rows">
      {#each rows as row (row.id)}
        <div class="lab-protocol-row">
          <div>
            <strong>{row.label}</strong>
            <span>{m.lab_type_and_size({ type: row.type, count: row.byteCount })}</span>
          </div>
          <Button type="button" size="sm" variant="outline" onclick={() => onView(row)}>
            <Eye data-icon="inline-start" aria-hidden="true" />
            {m.lab_view()}
          </Button>
        </div>
      {/each}
    </div>
  </Collapsible.Content>
</Collapsible.Root>

<style>
@layer blocks {
  :global(.lab-protocol-details) {
    border: 1px solid var(--border);
  }

  :global(.lab-protocol-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-3);
    background: transparent;
    color: var(--foreground);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .lab-protocol-rows {
    display: grid;
    border-top: 1px solid var(--border);
  }

  .lab-protocol-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .lab-protocol-row + .lab-protocol-row {
    border-top: 1px solid var(--border);
  }

  .lab-protocol-row > div {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .lab-protocol-row strong {
    font-size: 0.75rem;
  }

  .lab-protocol-row span {
    color: var(--muted-foreground);
    font-size: 0.68rem;
  }
}
</style>
