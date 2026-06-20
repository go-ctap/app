<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import WindowControls from "./WindowControls.svelte";
  import {
    startWindowDrag,
    type WindowControlsOptions,
  } from "./window";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    controlsOrder?: "right" | "left";
    windowControlsProps?: WindowControlsOptions;
    nativeWindowControlsOverlay?: boolean;
    children?: Snippet;
    class?: string;
  }

  let {
    controlsOrder = "right",
    windowControlsProps = {},
    nativeWindowControlsOverlay = false,
    children,
    class: className = "",
    onpointerdown,
    ...rest
  }: Props = $props();

  let controlsOnLeft = $derived(controlsOrder === "left");
  let contentInsetStyle = $derived(toolbarInsetStyle(controlsOnLeft));

  function toolbarInsetStyle(left: boolean) {
    const inset = "calc(138px + 1rem)";
    return left ? `padding-left: ${inset};` : `padding-right: ${inset};`;
  }

  function handlePointerDown(event: PointerEvent) {
    onpointerdown?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.detail > 1) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("[data-window-drag-exclude], button, a, input, select, textarea, [role='button']")) return;

    if (!nativeWindowControlsOverlay) {
      startWindowDrag();
    }
  }
</script>

<div
  {...rest}
  data-window-drag-region
  class="window-titlebar"
  data-native-overlay={nativeWindowControlsOverlay ? "true" : undefined}
  onpointerdown={handlePointerDown}
>
  {#if !nativeWindowControlsOverlay}
    <WindowControls
      {...windowControlsProps}
      justify={false}
      data-side={controlsOnLeft ? "left" : "right"}
    />
  {/if}

  <div class={className} style={contentInsetStyle}>
    {@render children?.()}
  </div>
</div>

<style>
  .window-titlebar {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    overflow: visible;
    user-select: none;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .window-titlebar[data-native-overlay="true"] {
    -webkit-user-select: none;
    user-select: none;
  }

  .window-titlebar :global(.window-controls[data-side]) {
    position: absolute;
    top: 0;
    z-index: 20;
  }

  .window-titlebar :global(.window-controls[data-side="left"]) {
    left: 0;
  }

  .window-titlebar :global(.window-controls[data-side="right"]) {
    right: 0;
  }
</style>
