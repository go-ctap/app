<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    value: string;
    label: string;
  };

  let { value, label }: Props = $props();
  let revealed = $state(false);
  let byteCount = $derived(Math.floor(value.length / 2));
</script>

<span class="sensitive-hex-value" data-revealed={revealed ? "true" : undefined}>
  {#if revealed}
    <code>{value}</code>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={m.sensitive_value_hide({ label })}
      onclick={() => { revealed = false; }}
    >
      <EyeOff aria-hidden="true" />
    </Button>
  {:else}
    <span aria-label={m.sensitive_value_hidden({ label, count: byteCount })}>••••••••</span>
    <span class="sensitive-hex-count">{m.lab_byte_count({ count: byteCount })}</span>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={m.sensitive_value_reveal({ label })}
      onclick={() => { revealed = true; }}
    >
      <Eye aria-hidden="true" />
    </Button>
  {/if}
</span>

<style>
@layer blocks {
  .sensitive-hex-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .sensitive-hex-value code {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .sensitive-hex-count {
    color: var(--muted-foreground);
    font-size: 0.68rem;
  }
}
</style>
