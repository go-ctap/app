<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		viewportRef = $bindable(null),
		class: className,
		orientation = "vertical",
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		ref?: HTMLElement | null;
		viewportRef?: HTMLElement | null;
		orientation?: "vertical" | "horizontal" | "both";
		children?: Snippet;
	} = $props();
</script>

<div bind:this={ref} data-slot="scroll-area" class={cn("relative size-full", className)}>
	<div
		bind:this={viewportRef}
		data-slot="scroll-area-viewport"
		data-orientation={orientation}
		class="native-scroll-area-viewport focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
		{...restProps}
	>
		{@render children?.()}
	</div>
</div>

<style>
	@layer blocks {
		.native-scroll-area-viewport {
			overflow: hidden;
		}
	}

	@layer exceptions {
		.native-scroll-area-viewport[data-orientation="vertical"] {
			overflow-y: auto;
		}

		.native-scroll-area-viewport[data-orientation="horizontal"] {
			overflow-x: auto;
		}

		.native-scroll-area-viewport[data-orientation="both"] {
			overflow: auto;
		}
	}
</style>
