<script lang="ts">
  type Props = {
    source: string;
    wrap?: boolean;
  };

  const newline = "\n";

  let { source, wrap = false }: Props = $props();
  let highlighted = $derived(highlight(source));

  async function highlight(value: string) {
    const { highlightJson } = await import("$lib/json-highlighter");
    return highlightJson(value);
  }
</script>

<div class="json-code" data-wrap={wrap || undefined}>
  {#await highlighted then lines}
    <pre class="shiki json-code-highlighted"><code>{#each lines as line, lineIndex (line.id)}{#each line.tokens as token (token.offset)}<span style:--shiki-light={token.variants.light?.color} style:--shiki-dark={token.variants.dark?.color}>{token.content}</span>{/each}{#if lineIndex < lines.length - 1}{newline}{/if}{/each}</code></pre>
  {/await}
</div>

<style>
@layer blocks {
  .json-code {
    width: 100%;
    min-width: 0;
  }

  .json-code .shiki,
  .json-code .shiki span {
    color: var(--shiki-light);
  }

  .json-code .shiki {
    width: max-content;
    min-width: 100%;
    margin: 0;
    padding: var(--json-code-padding, var(--space-3));
    background: transparent;
    font-family: var(--font-mono);
    font-size: var(--json-code-font-size, 0.82rem);
    line-height: var(--json-code-line-height, 1.55);
    white-space: pre;
  }

  :global(.dark) .json-code .shiki,
  :global(.dark) .json-code .shiki span {
    color: var(--shiki-dark);
  }
}

@layer exceptions {
  .json-code[data-wrap] .shiki {
    width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}
</style>
