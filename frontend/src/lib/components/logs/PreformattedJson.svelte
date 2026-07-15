<script lang="ts">
  import { Copy } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { copyToClipboard } from "$lib/clipboard.js";
  import JsonCode from "$lib/components/shared/JsonCode.svelte";
  import { compactLogJSON } from "$lib/log-presentation.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    source: string;
    title: string;
  };

  let { source, title }: Props = $props();
  let compactSource = $derived(compactLogJSON(source));

  function copyJSON() {
    void copyToClipboard(compactSource, m.logs_json_copied());
  }
</script>

<section class="preformatted-json" aria-label={title}>
  <header class="preformatted-json-header">
    <h3>{title}</h3>
    <Button type="button" size="sm" variant="outline" aria-label={m.copy_json()} onclick={copyJSON}>
      <Copy data-icon="inline-start" aria-hidden="true" />
      {m.copy_json()}
    </Button>
  </header>
  <ScrollArea class="preformatted-json-scroll">
    <JsonCode source={compactSource} wrap />
  </ScrollArea>
</section>

<style>
  @layer blocks {
    .preformatted-json {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 12rem;
      height: 100%;
      flex: 1 1 auto;
      border: 1px solid var(--border);
      background: var(--card);
    }

    .preformatted-json-header {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding: var(--space-2) var(--space-3);
    }

    .preformatted-json-header h3 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }

    :global(.preformatted-json-scroll) {
      --json-code-font-size: 0.72rem;

      min-width: 0;
      min-height: 0;
      height: 100%;
    }
  }
</style>
