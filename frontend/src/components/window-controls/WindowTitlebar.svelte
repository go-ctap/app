<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { startWindowDrag } from "./window";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    nativeWindowControlsOverlay?: boolean;
    children?: Snippet;
    class?: string;
  }

  let {
    nativeWindowControlsOverlay = false,
    children,
    class: className = "",
    onpointerdown,
    ...rest
  }: Props = $props();

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
  <div class={className}>
    {@render children?.()}
  </div>
</div>

<style>
@layer blocks {
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
}
</style>
