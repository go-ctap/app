<script module lang="ts">
  import type { HighlighterCore } from "shiki/core";

  let highlighter: Promise<HighlighterCore> | undefined;

  function getHighlighter() {
    highlighter ??= Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("@shikijs/langs/json"),
      import("@shikijs/themes/material-theme-lighter"),
      import("@shikijs/themes/material-theme-darker"),
    ]).then(([core, engine, json, light, dark]) =>
      core.createHighlighterCore({
        langs: json.default,
        themes: [light.default, dark.default],
        engine: engine.createJavaScriptRegexEngine(),
      })
    );

    return highlighter;
  }

  async function highlightJson(jsonText: string) {
    try {
      return (await getHighlighter()).codeToHtml(jsonText, {
        lang: "json",
        themes: {
          light: "material-theme-lighter",
          dark: "material-theme-darker",
        },
      });
    } catch {
      return "";
    }
  }
</script>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { pretty } from "$lib/format";

  type Props = {
    value: unknown;
    title?: string;
    variant?: "card" | "bare";
  };

  let { value, title = "Raw JSON", variant = "card" }: Props = $props();
  let source = $derived(pretty(value));
  let highlighted = $derived(highlightJson(source));

  async function copy() {
    await navigator.clipboard?.writeText(source);
  }
</script>

{#snippet codeBlock()}
  <ScrollArea
    orientation="both"
    class="max-h-[420px] rounded-md border bg-muted/40"
    scrollbarXClasses="z-20"
    scrollbarYClasses="z-20"
  >
    {#await highlighted}
      <pre class="m-0 min-w-max bg-transparent p-3 text-sm leading-6 whitespace-pre text-foreground">{source}</pre>
    {:then html}
      {#if html}
        <div class="[&_pre]:m-0 [&_pre]:min-w-max [&_pre]:p-3 [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:outline-none [&_code]:font-mono">
          {@html html}
        </div>
      {:else}
        <pre class="m-0 min-w-max bg-transparent p-3 text-sm leading-6 whitespace-pre text-foreground">{source}</pre>
      {/if}
    {:catch}
      <pre class="m-0 min-w-max bg-transparent p-3 text-sm leading-6 whitespace-pre text-foreground">{source}</pre>
    {/await}
  </ScrollArea>
{/snippet}

{#if variant === "card"}
  <Card.Root>
    <Card.Content class="grid gap-3 pt-4">
      <div class="flex items-center justify-between gap-3">
        <h3>{title}</h3>
        <Button variant="outline" size="sm" type="button" onclick={copy}>Copy</Button>
      </div>
      {@render codeBlock()}
    </Card.Content>
  </Card.Root>
{:else}
  <section class="grid gap-2">
    <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{title}</span>
      <Button variant="outline" size="xs" type="button" onclick={copy}>Copy</Button>
    </div>
    {@render codeBlock()}
  </section>
{/if}
