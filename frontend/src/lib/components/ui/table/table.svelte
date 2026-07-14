<script lang="ts">
	import type { HTMLTableAttributes } from "svelte/elements";

	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();

	let container: HTMLDivElement;

	function handleHorizontalWheel(event: WheelEvent) {
		if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

		const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
		if (maxScrollLeft === 0) return;

		const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
			? 16
			: event.deltaMode === WheelEvent.DOM_DELTA_PAGE
				? container.clientWidth
				: 1;
		const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, container.scrollLeft + event.deltaX * unit));
		if (nextScrollLeft === container.scrollLeft) return;

		event.preventDefault();
		container.scrollLeft = nextScrollLeft;
	}
</script>

<div
	bind:this={container}
	data-slot="table-container"
	class="relative w-full overflow-x-auto overscroll-x-contain"
	onwheel={handleHorizontalWheel}
>
	<table bind:this={ref} data-slot="table" class={cn("w-full caption-bottom text-xs", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
