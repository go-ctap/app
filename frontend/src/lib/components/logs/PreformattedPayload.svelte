<script lang="ts">
  import { Copy } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { copyToClipboard } from "$lib/clipboard.js";

  import { m } from "../../../paraglide/messages.js";
  import CTAPDiagnosticCode from "./CTAPDiagnosticCode.svelte";

  type Props = {
    source: string;
  };

  let { source }: Props = $props();

  function copyPayload() {
    void copyToClipboard(source, m.logs_payload_copied());
  }
</script>

<section class="preformatted-payload" aria-label={m.logs_format_cbor_diagnostic()}>
  <header class="preformatted-payload-header">
    <h3>{m.logs_format_cbor_diagnostic()}</h3>
    <Tooltip.Provider delayDuration={350}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={m.logs_copy_payload()}
              onclick={copyPayload}
            >
              <Copy data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="top">{m.logs_copy_payload()}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </header>
  <ScrollArea class="preformatted-payload-scroll">
    <CTAPDiagnosticCode {source} />
  </ScrollArea>
</section>

<style>
  @layer blocks {
    .preformatted-payload {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 12rem;
      height: 100%;
      flex: 1 1 auto;
      border: 1px solid var(--border);
      background: var(--card);
    }

    .preformatted-payload-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding: var(--space-2) var(--space-3);
    }

    .preformatted-payload-header h3 {
      min-width: 0;
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }

    :global(.preformatted-payload-scroll) {
      --json-code-font-size: 0.72rem;

      min-width: 0;
      min-height: 0;
      height: 100%;
    }
  }
</style>
