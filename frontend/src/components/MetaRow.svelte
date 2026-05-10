<script lang="ts">
  import { m } from "../paraglide/messages.js";

  export let label = "";
  export let value: unknown = "";
</script>

<div class="grid min-h-8 grid-cols-[minmax(110px,auto)_minmax(0,1fr)] items-center gap-2 border-t py-2 first:border-t-0">
  <span class="text-sm text-muted-foreground">{label}</span>
  <strong class="min-w-0 break-words text-sm font-medium">{value || m.state_unknown()}</strong>
</div>
