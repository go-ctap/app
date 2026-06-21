<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import type { OverviewInspectResult } from "$lib/overview-types";
  import JsonView from "../components/JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  let { info = null, onCopy = () => {} }: { info?: OverviewInspectResult["info"] | null; onCopy?: () => void | Promise<void> } = $props();
</script>

<Collapsible.Root class="workbench-disclosure">
  <Collapsible.Trigger>{m.raw_inspection_data()}</Collapsible.Trigger>
  <Collapsible.Content class="workbench-disclosure__content">
    <div class="toolbar">
      <span><code>ctapkit</code> {m.raw_operation_response()}</span>
      <Button variant="outline" type="button" onclick={onCopy}>{m.copy_json()}</Button>
    </div>
    <JsonView value={info} variant="code" />
  </Collapsible.Content>
</Collapsible.Root>

<style>
@layer blocks {
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
