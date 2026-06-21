<script lang="ts">
  import type { OverviewInspectResult } from "$lib/overview-types";
  import JsonView from "../components/JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  let { info = null, onCopy = () => {} }: { info?: OverviewInspectResult["info"] | null; onCopy?: () => void | Promise<void> } = $props();
</script>

<details class="workbench-disclosure">
  <summary>{m.raw_inspection_data()}</summary>
  <div class="workbench-disclosure__content">
    <div class="toolbar">
      <span><code>ctapkit</code> {m.raw_operation_response()}</span>
      <button type="button" onclick={onCopy}>{m.copy_json()}</button>
    </div>
    <JsonView value={info} variant="code" />
  </div>
</details>

<style>
@layer blocks {
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
}
</style>
