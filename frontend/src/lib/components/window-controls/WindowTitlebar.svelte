<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    nativeWindowControlsOverlay?: boolean;
    children?: Snippet;
    class?: string;
  }

  let {
    nativeWindowControlsOverlay = false,
    children,
    class: className = "",
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  class="window-titlebar"
  data-native-overlay={nativeWindowControlsOverlay ? "true" : undefined}
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
      --wails-draggable: drag;
    }

    .window-titlebar[data-native-overlay="true"] {
      -webkit-user-select: none;
      user-select: none;
    }
}
</style>
