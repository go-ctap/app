<script lang="ts">
  import type { InspectInfo } from "../../../../bindings/github.com/go-ctap/kit/model";

  import JsonView from "$lib/components/shared/JsonView.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";

  import { m } from "../../../paraglide/messages.js";

  let { info = null, onCopy = () => {} }: { info?: InspectInfo | null; onCopy?: () => void | Promise<void> } = $props();
</script>

<Collapsible.Root class="raw-inspection">
  <Collapsible.Trigger class="raw-inspection-trigger">{m.raw_inspection_data()}</Collapsible.Trigger>
  <Collapsible.Content class="raw-inspection-content">
    <div class="toolbar">
      <span><code>ctapkit</code> {m.raw_operation_response()}</span>
      <Button variant="outline" type="button" onclick={onCopy}>{m.copy_json()}</Button>
    </div>
    <JsonView value={info} variant="code" />
  </Collapsible.Content>
</Collapsible.Root>

<style>
@layer blocks {
  :global(.raw-inspection) {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--card);
  }

  :global(.raw-inspection-trigger) {
    display: flex;
    width: 100%;
    cursor: pointer;
    align-items: center;
    border: 0;
    background: transparent;
    color: var(--foreground);
    padding: var(--space-4);
    font-weight: 700;
  }

  :global(.raw-inspection-content) {
    display: grid;
    gap: var(--space-3);
    border-top: 1px solid var(--border);
    padding: var(--space-4);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }
}
</style>
