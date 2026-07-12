<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    children?: Snippet;
    class?: string;
  }

  let {
    children,
    class: className = "",
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  class="window-titlebar"
  data-window-titlebar-region="true"
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
}
</style>
