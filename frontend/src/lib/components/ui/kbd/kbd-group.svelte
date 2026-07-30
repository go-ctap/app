<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();

  function attachRef(element: HTMLElement) {
    ref = element;

    return () => {
      if (ref === element) ref = null;
    };
  }
</script>

<kbd
  {@attach attachRef}
  data-slot="kbd-group"
  class={cn("gap-1 inline-flex items-center", className)}
  {...restProps}
>
  {@render children?.()}
</kbd>
