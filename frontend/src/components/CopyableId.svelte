<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";

  type Props = {
    value?: string;
    label?: string;
    empty?: string;
    copied?: (value: string) => void;
  };

  let { value = "", label = "Identifier", empty = "not reported", copied = () => {} }: Props = $props();
  let display = $derived(value || empty);

  async function copy() {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    copied(value);
  }
</script>

<span class="copy-id">
  <span class="copy-id-label">{label}</span>
  <code title={display}>{display}</code>
  <Button variant="outline" size="xs" type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} disabled={!value} onclick={copy}>Copy</Button>
</span>
