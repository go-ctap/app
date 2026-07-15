<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import type { Attachment } from "svelte/attachments";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const attachRef: Attachment<HTMLDivElement> = (element) => {
		ref = element;
		return () => {
			ref = null;
		};
	};
</script>

<div
	{@attach attachRef}
	data-slot="sheet-header"
	class={cn("gap-0.5 p-4 flex flex-col", className)}
	{...restProps}
>
	{@render children?.()}
</div>
