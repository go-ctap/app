<script lang="ts">
  import { Copy } from "@lucide/svelte";

  import { copyToClipboard } from "$lib/clipboard";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    label: string;
    value: string;
  };

  let { label, value }: Props = $props();

  let byteCount = $derived(Math.floor(value.length / 2));
  let compactValue = $derived(
    value.length > 42 ? `${value.slice(0, 22)}…${value.slice(-16)}` : value,
  );

  async function copyValue() {
    await copyToClipboard(value, m.lab_value_copied({ label }));
  }
</script>

<Tooltip.Provider delayDuration={350}>
  <span class="lab-hex-value">
    <code title={value}>{compactValue || "—"}</code>
    <span class="lab-hex-value-count">{m.lab_byte_count({ count: byteCount })}</span>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-xs"
            type="button"
            aria-label={m.lab_copy({ label })}
            disabled={!value}
            onclick={copyValue}
          >
            <Copy data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top">{m.lab_copy({ label })}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </span>
</Tooltip.Provider>

<style>
@layer blocks {
  .lab-hex-value {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    max-width: 100%;
  }

  .lab-hex-value code {
    max-width: 100%;
    overflow: hidden;
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lab-hex-value-count {
    color: var(--muted-foreground);
    font-size: 0.7rem;
    white-space: nowrap;
  }
}
</style>
