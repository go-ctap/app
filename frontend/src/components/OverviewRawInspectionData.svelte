<script lang="ts">
  import JsonView from "../components/JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  let { info = null, onCopy = () => {} }: { info?: unknown; onCopy?: () => void | Promise<void> } = $props();
</script>

<details class="raw-panel">
  <summary>{m.raw_inspection_data()}</summary>
  <div class="content">
    <div class="toolbar">
      <span><code>ctapkit</code> {m.raw_operation_response()}</span>
      <button type="button" onclick={onCopy}>{m.copy_json()}</button>
    </div>
    <JsonView value={info} variant="code" />
  </div>
</details>

<style>
  .raw-panel {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
  }

  summary {
    cursor: pointer;
    padding: var(--space-4);
    font-weight: 700;
  }

  .content {
    display: grid;
    gap: var(--space-3);
    border-top: 1px solid var(--color-border);
    padding: var(--space-4);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
</style>
