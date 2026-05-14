<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";
  import WindowControls from "./WindowControls.svelte";
  import { resolveWindowControlsPlatform, startWindowDrag, type WindowControlsOptions } from "./window";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    controlsOrder?: "right" | "left" | "platform" | "system";
    windowControlsProps?: WindowControlsOptions;
    children?: Snippet;
    class?: string;
  }

  let {
    controlsOrder = "system",
    windowControlsProps = {},
    children,
    class: className = "",
    onpointerdown,
    ...rest
  }: Props = $props();

  let platform = $derived(resolveWindowControlsPlatform(windowControlsProps.platform));
  let controlsOnLeft = $derived(
    controlsOrder === "left" ||
      (controlsOrder === "platform" && platform === "macos") ||
      (controlsOrder === "system" && platform === "macos")
  );

  function handlePointerDown(event: PointerEvent) {
    onpointerdown?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.detail > 1) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("[data-window-drag-exclude], button, a, input, select, textarea, [role='button']")) return;

    startWindowDrag();
  }
</script>

<div
  {...rest}
  data-window-drag-region
  class={cn("flex select-none flex-row overflow-hidden", className)}
  onpointerdown={handlePointerDown}
>
  {#if controlsOnLeft}
    <WindowControls {...windowControlsProps} justify={false} />
    {@render children?.()}
  {:else}
    {@render children?.()}
    <WindowControls {...windowControlsProps} justify={false} />
  {/if}
</div>
