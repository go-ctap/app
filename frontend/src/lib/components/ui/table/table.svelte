<script lang="ts">
  import type { HTMLTableAttributes } from "svelte/elements";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div data-slot="table-container" class="relative w-full">
  <ScrollArea orientation="horizontal" class="w-full">
    <table
      bind:this={ref}
      data-slot="table"
      class={cn("w-full caption-bottom text-xs", className)}
      {...restProps}
    >
      {@render children?.()}
    </table>
  </ScrollArea>
</div>
