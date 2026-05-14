<script lang="ts">
  import type { Snippet } from "svelte";
  import { CircleDashed } from "@lucide/svelte";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { m } from "../paraglide/messages.js";

  type Props = {
    title?: string;
    message?: string;
    eyebrow?: string;
    variant?: "default" | "compact" | "workspace";
    icon?: Snippet;
    actions?: Snippet;
  };

  let {
    title = m.nothing_here_yet(),
    message = "",
    eyebrow = "",
    variant = "default",
    icon,
    actions,
  }: Props = $props();

  let rootClass = $derived(
    variant === "compact"
      ? "from-muted/20 to-background mt-3 min-h-32 bg-gradient-to-b from-30% p-6"
      : "from-muted/20 to-background min-h-[calc(100vh-8rem)] bg-gradient-to-b from-30% p-8"
  );
</script>

<Empty.Root class={rootClass}>
  <Empty.Header>
    <Empty.Media variant="icon" aria-hidden="true">
      {#if icon}
        {@render icon()}
      {:else}
        <CircleDashed />
      {/if}
    </Empty.Media>
    {#if eyebrow}
      <p class="text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
    {/if}
    <Empty.Title>{title}</Empty.Title>
    {#if message}
      <Empty.Description>{message}</Empty.Description>
    {/if}
  </Empty.Header>
  {#if actions}
    <Empty.Content class="flex flex-wrap justify-center gap-2">
      {@render actions()}
    </Empty.Content>
  {/if}
</Empty.Root>
