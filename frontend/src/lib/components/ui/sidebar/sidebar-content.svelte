<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="sidebar-content"
	data-sidebar="content"
	class={cn(
		"gap-2 flex min-h-0 flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:overflow-hidden",
		className
	)}
	{...restProps}
>
	<ScrollArea class="min-h-0 flex-1" scrollbarYClasses="z-20">
		<div class="flex min-h-full flex-col gap-2">
			{@render children?.()}
		</div>
	</ScrollArea>
</div>
