<script lang="ts">
	import './app.css';
	import { onMount } from "svelte";
	import { Events } from "@wailsio/runtime";
	import { ShieldCheck, X } from "@lucide/svelte";
	import { Alert } from "$lib/components/ui/alert/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import type * as kitservice from "../bindings/github.com/go-ctap/kit/service/models";

	import {
		bootstrap,
		handleInteractionRequested,
		handleOperationProgress,
		shutdownWorkbench
	} from "$lib/controller";

	import {
		activeScreen,
		appError,
		devices,
		selectedDevice,
		sessionStatus,
		statusBar,
		toasts,
		type ActiveScreen
	} from "$lib/stores";

	import { currentLocale } from "$lib/i18n";
	import { m } from "./paraglide/messages.js";
	import AppSidebar from "./components/AppSidebar.svelte";
	import InteractionModal from "./components/InteractionModal.svelte";
	import { AuthenticatorTitlebarControl, WindowControls, WindowTitlebar } from "./components/window-controls";
	import Overview from "./screens/Overview.svelte";
	import Settings from "./screens/Settings.svelte";

	type WailsDataEvent<T> = { data: T };

	let refreshing = $state(false);
	let initialized = $state(false);
	let noDevices = $derived(initialized && !refreshing && $devices.length === 0);

	function navigate(screen: ActiveScreen) {
		activeScreen.set(screen);
	}

	function dismissToast(index: number) {
		toasts.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
	}

	onMount(() => {
		activeScreen.set("overview");

		const offProgress = Events.On("ctapkit:operation-event", (event: WailsDataEvent<kitservice.OperationEventEnvelope>) => {
			handleOperationProgress(event.data);
		});

		const offInteraction = Events.On("ctapkit:interaction-requested", (event: WailsDataEvent<kitservice.InteractionPrompt>) => {
			handleInteractionRequested(event.data);
		});

		refreshing = true;

		bootstrap().finally(() => {
			refreshing = false;
			initialized = true;
		});

		return () => {
			offProgress?.();
			offInteraction?.();
			void shutdownWorkbench();
		};
	});
</script>

{#key $currentLocale}
	<div class="app-shell">
		<AppSidebar
			activeScreen={$activeScreen}
			sessionStatus={$sessionStatus}
			selectedDevice={$selectedDevice}
			statusBar={$statusBar}
			onNavigate={navigate}
		/>

		<section class="app-workspace">
			<header class="app-header">
				<WindowTitlebar
					class="titlebar-content"
					nativeWindowControlsOverlay={false}
				>
					<AuthenticatorTitlebarControl refreshing={refreshing} />
					<div class="titlebar-drag-space" aria-hidden="true"></div>
					<WindowControls />
				</WindowTitlebar>
			</header>

			{#if $appError}
				<Alert class="app-alert" variant="destructive" role="alert">{$appError}</Alert>
			{/if}

			<main class="main-view">
				{#if $activeScreen === "settings"}
					<Settings />
				{:else if noDevices}
					<section
						class="empty-workbench"
						aria-label={m.no_authenticators_connected()}
					>
						<ShieldCheck size={34} strokeWidth={1.8} />
						<h1>{m.no_authenticators_connected()}</h1>
						<p>{m.no_authenticators_connected_message()}</p>
					</section>
				{:else}
					<Overview />
				{/if}
			</main>
		</section>

		<InteractionModal />

		<div class="toast-stack flow" aria-live="polite">
			{#each $toasts as toast, index (`${index}:${toast}`)}
				<div class="toast">
					<span>{toast}</span>

					<Button
						class="toast__dismiss"
						variant="ghost"
						size="icon-xs"
						type="button"
						aria-label={m.close()}
						onclick={() => dismissToast(index)}
					><X size={14} aria-hidden="true" /></Button>
				</div>
			{/each}
		</div>
	</div>
{/key}

<style>
	@layer blocks {
		.app-shell {
			display: grid;
			grid-template-columns: 16rem minmax(0, 1fr);
			min-width: 0;
			height: 100vh;
			background: var(--background);
			color: var(--foreground);
		}
		.app-workspace {
			display: grid;
			grid-template-rows: 58px minmax(0, 1fr);
			min-width: 0;
			min-height: 0;
		}
		.app-header {
			z-index: 10;
			min-width: 0;
			border-bottom: 1px solid var(--border);
			background: color-mix(in srgb, var(--card) 92%, transparent);
			box-shadow: 0 1px 0 color-mix(in srgb, var(--border) 70%, transparent);
		}
		:global(.titlebar-content) {
			display: grid;
			grid-template-columns: minmax(18rem, 38rem) minmax(2rem, 1fr) auto;
			align-items: center;
			height: 58px;
			min-width: 0;
			padding: 0 0 0 var(--space-4);
		}
		.titlebar-drag-space {
			min-width: 0;
			height: 100%;
			--wails-non-client-region: caption;
		}
		.main-view {
			min-width: 0;
			min-height: 0;
			overflow: auto;
			padding: var(--space-4);
		}
		:global(.app-alert) {
			position: fixed;
			top: 70px;
			right: var(--space-4);
			left: calc(16rem + var(--space-4));
			z-index: 20;
			border: 1px solid color-mix(in srgb, var(--destructive) 34%, var(--border));
			border-radius: var(--radius);
			background: color-mix(in srgb, var(--destructive) 10%, var(--background));
			color: var(--destructive);
			padding: var(--space-3) var(--space-4);
			box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
		}
		.empty-workbench {
			display: grid;
			place-items: center;
			align-content: center;
			gap: var(--space-2);
			min-height: calc(100vh - 8rem);
			color: var(--muted-foreground);
			text-align: center;
		}
		.empty-workbench h1 {
			margin: var(--space-2) 0 0;
			color: var(--foreground);
			font-size: 1.15rem;
		}
		.empty-workbench p {
			max-width: 34rem;
			margin: 0;
			line-height: 1.55;
		}
		.toast-stack {
			position: fixed;
			right: var(--space-4);
			bottom: var(--space-4);
			z-index: 30;
			display: grid;
			gap: var(--space-2);
			max-width: min(24rem, calc(100vw - 2rem));
		}
		.toast {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-3);
			border: 1px solid var(--border);
			border-radius: var(--radius);
			background: var(--popover);
			color: var(--foreground);
			padding: var(--space-2) var(--space-3);
			box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
			font-size: 0.875rem;
		}
		:global(.toast__dismiss) {
			width: 24px;
			height: 24px;
			min-height: 24px;
			flex: 0 0 auto;
			padding: 0;
		}
		@media (max-width: 900px) {
			.app-shell {
				grid-template-columns: 5rem minmax(0, 1fr);
			}
			:global(.app-alert) {
				left: calc(5rem + var(--space-4));
			}
			:global(.titlebar-content) {
				grid-template-columns: minmax(0, 1fr) minmax(1rem, 1fr) auto;
				padding-left: var(--space-3);
			}
		}
	}
</style>
