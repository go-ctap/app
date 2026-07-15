<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    valueHex: string;
  };

  let { valueHex }: Props = $props();
  let revealed = $state(false);
  let byteCount = $derived(Math.floor(valueHex.length / 2));
</script>

<span class="lab-secret-value" data-revealed={revealed}>
  {#if revealed}
    <code>{valueHex}</code>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={m.lab_hide_secret()}
      onclick={() => { revealed = false; }}
    >
      <EyeOff aria-hidden="true" />
    </Button>
  {:else}
    <span aria-label={m.lab_output_hidden({ count: byteCount })}>••••••••</span>
    <span class="lab-secret-count">{m.lab_byte_count({ count: byteCount })}</span>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={m.lab_reveal_secret()}
      onclick={() => { revealed = true; }}
    >
      <Eye aria-hidden="true" />
    </Button>
  {/if}
</span>

<style>
@layer blocks {
  .lab-secret-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .lab-secret-value code {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .lab-secret-count {
    color: var(--muted-foreground);
    font-size: 0.68rem;
  }
}
</style>
