<script lang="ts">
	import { onMount } from "svelte";
	import { Events, System } from "@wailsio/runtime";
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { ...restProps }: SonnerProps = $props();
	let theme = $state<NonNullable<SonnerProps["theme"]>>("light");

	async function syncTheme() {
		try {
			theme = (await System.IsDarkMode()) ? "dark" : "light";
		} catch {
			theme = "light";
		}
	}

	onMount(() => {
		void syncTheme();
		const offThemeChanged = Events.On(Events.Types.Common.ThemeChanged, () => {
			void syncTheme();
		});

		return offThemeChanged;
	});
</script>

<Sonner
	{theme}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" />
	{/snippet}
</Sonner>
