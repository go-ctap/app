<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { Attachment } from "svelte/attachments";
	import type { HTMLAttributes } from "svelte/elements";

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
	data-slot="sheet-footer"
	class={cn("gap-2 p-4 mt-auto flex flex-col", className)}
	{...restProps}
>
	{@render children?.()}
</div>
