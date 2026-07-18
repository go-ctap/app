<script lang="ts">
  import { Copy } from "@lucide/svelte";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { copyToClipboard } from "$lib/clipboard.js";
  import JsonCode from "$lib/components/shared/JsonCode.svelte";
  import { compactLogJSON } from "$lib/log-presentation.js";

  import { m } from "../../../paraglide/messages.js";

  export type LogPayloadFormat = "json" | "cbor-diagnostic";

  type Props = {
    source: string;
    title: string;
    format: LogPayloadFormat;
  };

  let { source, title, format }: Props = $props();
  let displaySource = $derived(format === "json" ? compactLogJSON(source) : source);
  let formatLabel = $derived(
    format === "json" ? m.logs_format_json() : m.logs_format_cbor_diagnostic(),
  );

  function copyPayload() {
    void copyToClipboard(displaySource, m.logs_payload_copied());
  }
</script>

<section class="preformatted-payload" aria-label={title}>
  <header class="preformatted-payload-header">
    <div class="preformatted-payload-heading">
      <h3>{title}</h3>
      <Badge variant="outline">{formatLabel}</Badge>
    </div>
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={m.logs_copy_payload()}
      onclick={copyPayload}
    >
      <Copy data-icon="inline-start" aria-hidden="true" />
      {m.logs_copy_payload()}
    </Button>
  </header>
  <ScrollArea class="preformatted-payload-scroll">
    {#if format === "json"}
      <JsonCode source={displaySource} wrap />
    {:else}
      <pre class="cbor-diagnostic"><code>{displaySource}</code></pre>
    {/if}
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

    .preformatted-payload-header,
    .preformatted-payload-heading {
      display: flex;
      gap: var(--space-3);
      align-items: center;
    }

    .preformatted-payload-header {
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding: var(--space-2) var(--space-3);
    }

    .preformatted-payload-heading {
      min-width: 0;
    }

    .preformatted-payload-heading h3 {
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

    .cbor-diagnostic {
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: var(--space-3);
      color: var(--foreground);
      background: transparent;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      line-height: 1.55;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  }
</style>
