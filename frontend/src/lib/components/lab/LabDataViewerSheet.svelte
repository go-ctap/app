<script lang="ts">
  import { Binary, Braces, Copy, X } from "@lucide/svelte";

  import { copyToClipboard } from "$lib/clipboard";
  import JsonCode from "$lib/components/shared/JsonCode.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { sanitizedJson } from "$lib/redaction";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    open?: boolean;
    title: string;
    description?: string;
    kind: "json" | "hex";
    value: unknown;
    byteCount?: number;
    onOpenChange?: (open: boolean) => void;
  };

  let {
    open = false,
    title,
    description,
    kind,
    value,
    byteCount = 0,
    onOpenChange = () => undefined,
  }: Props = $props();

  let source = $derived(kind === "json" ? (sanitizedJson(value) ?? "null") : String(value));
  let formatLabel = $derived(
    kind === "json" ? m.lab_json() : m.lab_type_and_size({ type: m.lab_hex(), count: byteCount }),
  );
  let descriptionText = $derived(description ?? formatLabel);

  async function copyJSON() {
    await copyToClipboard(source, m.json_copied());
  }
</script>

<Sheet.Root {open} {onOpenChange}>
  <Sheet.Content side="right" class="lab-data-sheet" showCloseButton={false}>
    <header class="lab-data-sheet-titlebar">
      <div class="lab-data-sheet-identification">
        <span class="lab-data-sheet-icon" aria-hidden="true">
          {#if kind === "json"}
            <Braces />
          {:else}
            <Binary />
          {/if}
        </span>

        <Sheet.Header class="lab-data-sheet-heading">
          <Sheet.Title>{title}</Sheet.Title>
          <Sheet.Description>{descriptionText}</Sheet.Description>
        </Sheet.Header>
      </div>

      <Sheet.Close>
        {#snippet child({ props })}
          <Button {...props} type="button" variant="ghost" size="icon-sm" aria-label={m.close()}>
            <X aria-hidden="true" />
          </Button>
        {/snippet}
      </Sheet.Close>
    </header>

    <div class="lab-data-document">
      <header class="lab-data-document-toolbar">
        <Badge variant="outline">
          {#if kind === "json"}
            <Braces data-icon="inline-start" aria-hidden="true" />
          {:else}
            <Binary data-icon="inline-start" aria-hidden="true" />
          {/if}
          {formatLabel}
        </Badge>

        {#if kind === "json"}
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={m.lab_copy({ label: title })}
            onclick={copyJSON}
          >
            <Copy data-icon="inline-start" aria-hidden="true" />
            {m.copy()}
          </Button>
        {/if}
      </header>

      <ScrollArea
        class="lab-data-scroll"
        orientation="both"
        viewportProps={{ role: "region", "aria-label": title, tabindex: 0 }}
      >
        {#if kind === "json"}
          <JsonCode {source} />
        {:else}
          <pre class="lab-full-hex">{source}</pre>
        {/if}
      </ScrollArea>
    </div>
  </Sheet.Content>
</Sheet.Root>

<style>
  @layer blocks {
    :global(.lab-data-sheet) {
      width: min(48rem, 92vw);
      max-width: none;
      padding: 0;
      background: var(--card);
    }

    .lab-data-sheet-titlebar,
    .lab-data-sheet-identification,
    .lab-data-document-toolbar {
      display: flex;
      align-items: center;
    }

    .lab-data-sheet-titlebar {
      justify-content: space-between;
      gap: var(--space-3);
      min-height: 4.5rem;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border);
      background: color-mix(in oklch, var(--muted) 36%, var(--card));
    }

    .lab-data-sheet-identification {
      gap: var(--space-3);
      min-width: 0;
    }

    .lab-data-sheet-icon {
      display: grid;
      flex: 0 0 2rem;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--muted-foreground);
    }

    .lab-data-sheet-icon :global(svg) {
      width: 1rem;
      height: 1rem;
    }

    :global(.lab-data-sheet-heading) {
      min-width: 0;
      padding: 0;
    }

    :global(.lab-data-sheet-heading [data-slot="sheet-title"]),
    :global(.lab-data-sheet-heading [data-slot="sheet-description"]) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lab-data-document {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      flex: 1 1 auto;
      min-height: 0;
      margin: var(--space-4);
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--muted);
    }

    .lab-data-document-toolbar {
      justify-content: space-between;
      gap: var(--space-3);
      min-height: 3rem;
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--border);
      background: var(--card);
    }

    :global(.lab-data-scroll),
    :global(.lab-data-scroll > [data-slot="scroll-area-viewport"]) {
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }

    :global(.lab-data-scroll [data-slot="scroll-area-viewport"] > div) {
      min-width: 100%;
      min-height: 100%;
    }

    :global(.lab-data-scroll) {
      --json-code-padding: var(--space-5);
      --json-code-font-size: 0.78rem;
      --json-code-line-height: 1.6;
    }

    .lab-full-hex {
      width: max-content;
      min-width: 100%;
      min-height: 100%;
      margin: 0;
      padding: var(--space-5);
      background: transparent;
      font-size: 0.78rem;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  }
</style>
