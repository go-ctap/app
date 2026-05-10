<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { m } from "../paraglide/messages.js";

  type Props = {
    value?: string;
    label?: string;
    empty?: string;
    copied?: (value: string) => void;
  };

  let { value = "", label = m.identifier(), empty = m.not_reported(), copied = () => {} }: Props = $props();
  let display = $derived(value || empty);

  async function copy() {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    copied(value);
  }
</script>

<span class="grid min-w-0 grid-cols-[minmax(72px,auto)_minmax(0,1fr)_auto] items-center gap-2">
  <span class="text-xs text-muted-foreground">{label}</span>
  <code class="block min-w-0 truncate" title={display}>{display}</code>
  <Button variant="outline" size="xs" type="button" aria-label={m.copy_label({ label })} title={m.copy_label({ label })} disabled={!value} onclick={copy}>{m.copy()}</Button>
</span>
