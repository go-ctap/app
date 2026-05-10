<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import JsonView from "../components/JsonView.svelte";
  import { m } from "../paraglide/messages.js";

  export let info: unknown = null;
  export let onCopy: () => void | Promise<void> = () => {};
</script>

<details class="rounded-xl border bg-card text-sm shadow-xs ring-1 ring-foreground/10">
  <summary class="cursor-pointer px-6 py-4 font-medium">{m.raw_inspection_data()}</summary>
  <div class="grid gap-3 border-t px-6 pt-4 pb-6">
    <div class="flex items-center justify-between gap-3 text-muted-foreground">
      <span><code>ctapkit</code> {m.raw_operation_response()}</span>
      <Button variant="outline" size="sm" type="button" onclick={onCopy}>{m.copy_json()}</Button>
    </div>
    <JsonView value={info} variant="code" />
  </div>
</details>
