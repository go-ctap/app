<script lang="ts">
  import { copyToClipboard } from "$lib/clipboard";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { sanitizedJson } from "$lib/redaction";

  import { m } from "../../../paraglide/messages.js";
  import JsonCode from "$lib/components/shared/JsonCode.svelte";

  type Props = {
    value: unknown;
    title?: string;
    variant?: "bare" | "code";
  };

  let { value, title = m.raw_json(), variant = "bare" }: Props = $props();

  let source = $derived(sanitizedJson(value) ?? "null");

  async function copy() {
    await copyToClipboard(source, m.json_copied());
  }
</script>

{#if variant === "bare"}
  <div class="json-toolbar">
    <h3>{title}</h3>
    <Button variant="outline" type="button" onclick={copy}>{m.copy()}</Button>
  </div>
{/if}

<ScrollArea
  class="json-frame"
  orientation="both"
  viewportProps={{ role: "region", "aria-label": title, tabindex: 0 }}
>
  <JsonCode {source} />
</ScrollArea>

<style>
  @layer blocks {
    .json-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    h3 {
      margin: 0;
      font-size: 0.95rem;
    }

    :global(.json-frame),
    :global(.json-frame > [data-scroll-area-viewport]) {
      inline-size: 100%;
      max-inline-size: 100%;
      max-block-size: var(--json-view-max-block-size, min(26rem, 44dvh));
      min-inline-size: 0;
    }

    :global(.json-frame) {
      border: 1px solid var(--border);
      background: var(--muted);
    }
  }
</style>
