<script lang="ts">
  type Props = {
    source: string;
  };

  const newline = "\n";

  let { source }: Props = $props();
  let highlighted = $derived(highlight(source));

  async function highlight(value: string) {
    const { highlightCTAPDiagnostic } = await import("$lib/ctap-diagnostic-highlighter");
    return highlightCTAPDiagnostic(value);
  }
</script>

{#await highlighted then lines}
  <pre class="shiki ctap-diagnostic"><code>{#each lines as line, lineIndex (line.id)}{#each line.tokens as token (token.offset)}<span
    style:--shiki-light={token.variants.light?.color}
    style:--shiki-dark={token.variants.dark?.color}
    style:--shiki-light-bg={token.variants.light?.bgColor}
    style:--shiki-dark-bg={token.variants.dark?.bgColor}
  >{token.content}</span>{/each}{#if lineIndex < lines.length - 1}{newline}{/if}{/each}</code></pre>
{/await}

<style>
  @layer blocks {
    .ctap-diagnostic,
    .ctap-diagnostic span {
      color: var(--shiki-light);
    }

    .ctap-diagnostic {
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: var(--space-3);
      background: transparent;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      line-height: 1.55;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .ctap-diagnostic span {
      background: var(--shiki-light-bg, transparent);
    }

    :global(.dark) .ctap-diagnostic,
    :global(.dark) .ctap-diagnostic span {
      color: var(--shiki-dark);
    }

    :global(.dark) .ctap-diagnostic span {
      background: var(--shiki-dark-bg, transparent);
    }
  }
</style>
