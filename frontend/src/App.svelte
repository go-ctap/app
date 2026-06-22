<script lang="ts">
	import './app.css';
	import { onMount } from "svelte";
	import { Events } from "@wailsio/runtime";
	import { ShieldCheck } from "@lucide/svelte";
	import { Alert } from "$lib/components/ui/alert/index.js";
	import type * as kitservice from "../bindings/github.com/go-ctap/kit/service/models";

	import {
		bootstrap,
		answerPendingInteraction,
		handleInteractionRequested,
		handleOperationProgress,
		navigateToScreen,
		refreshDiscovery,
		selectToken,
		shutdownWorkbench
	} from "$lib/controller";

	import {
		activeScreen,
		appError,
		devices,
		pendingInteraction,
		selectedDevice,
		selectedSelector,
		sessionBusy,
		sessionStatus,
		statusBar,
		type ActiveScreen
	} from "$lib/stores";
	import { buildAuthenticatorTitlebarPresentation, buildInteractionModalPresentation, buildSidebarPresentation } from "$lib/shell-presentation";
	import type { InteractionModalAnswer } from "./components/InteractionModal.svelte";

	import { currentLocale } from "$lib/i18n";
	import { m } from "./paraglide/messages.js";
	import AppSidebar from "./components/AppSidebar.svelte";
	import EmptyState from "./components/EmptyState.svelte";
	import InteractionModal from "./components/InteractionModal.svelte";
	import { AuthenticatorTitlebarControl, WindowControls, WindowTitlebar } from "./components/window-controls";
	import Overview from "./screens/Overview.svelte";
	import Settings from "./screens/Settings.svelte";

	type WailsDataEvent<T> = { data: T };

	let refreshing = $state(false);
	let initialized = $state(false);
	let noDevices = $derived(initialized && !refreshing && $devices.length === 0);
	let titlebarPresentation = $derived(buildAuthenticatorTitlebarPresentation({
		devices: $devices,
		selectedDevice: $selectedDevice,
		selectedSelector: $selectedSelector,
		busy: refreshing || $sessionBusy,
	}));
	let sidebarPresentation = $derived(buildSidebarPresentation({
		activeScreen: $activeScreen,
		sessionStatus: $sessionStatus,
		selectedDevice: $selectedDevice,
		statusBar: $statusBar,
	}));
	let interactionModalPresentation = $derived($pendingInteraction ? buildInteractionModalPresentation($pendingInteraction) : null);

	function navigate(screen: ActiveScreen) {
		void navigateToScreen(screen);
	}

	function handleSelectToken(selector: string) {
		void selectToken(selector);
	}

	function handleClearSelection() {
		void selectToken("");
	}

	function handleRefreshDiscovery() {
		void refreshDiscovery();
	}

	function handleInteractionAnswer(answer: InteractionModalAnswer) {
		void answerPendingInteraction(answer);
	}

	onMount(() => {
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
			presentation={sidebarPresentation}
			onNavigate={navigate}
		/>

		<section class="app-workspace">
			<header class="app-header">
				<WindowTitlebar
					nativeWindowControlsOverlay={false}
				>
					<div class="titlebar-content">
						<AuthenticatorTitlebarControl
							presentation={titlebarPresentation}
							onSelect={handleSelectToken}
							onClear={handleClearSelection}
							onRefresh={handleRefreshDiscovery}
						/>
						<div class="titlebar-drag-space" aria-hidden="true"></div>
						<WindowControls />
					</div>
				</WindowTitlebar>
			</header>

			{#if $appError}
				<div class="app-alert">
					<Alert variant="destructive" role="alert">{$appError}</Alert>
				</div>
			{/if}

			<main class="main-view">
				{#if $activeScreen === "settings"}
					<Settings />
				{:else if noDevices}
					<EmptyState
						title={m.no_authenticators_connected()}
						message={m.no_authenticators_connected_message()}
						variant="workspace"
					>
						{#snippet icon()}
							<ShieldCheck size={34} strokeWidth={1.8} />
						{/snippet}
					</EmptyState>
				{:else}
					<Overview />
				{/if}
			</main>
		</section>

		<InteractionModal presentation={interactionModalPresentation} onAnswer={handleInteractionAnswer} />
	</div>
{/key}

<style>
	@layer blocks {
		.app-shell {
			display: grid;
			grid-template-columns: 17.5rem minmax(0, 1fr);
			min-width: 0;
			height: 100vh;
			background: var(--background);
			color: var(--foreground);
			--topbar-background: color-mix(in srgb, var(--card) 92%, var(--background));
			--topbar-border: var(--border);
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
			border-bottom: 1px solid var(--topbar-border);
			background: var(--topbar-background);
		}
		.titlebar-content {
			display: grid;
			grid-template-columns: minmax(18rem, 38rem) minmax(2rem, 1fr) auto;
			align-items: stretch;
			height: 58px;
			min-width: 0;
			padding: 0 0 0 var(--space-4);
		}
		.titlebar-drag-space {
			min-width: 0;
			height: 100%;
			--wails-non-client-region: caption;
			--wails-draggable: drag;
		}
		.main-view {
			display: grid;
			min-width: 0;
			min-height: 0;
			overflow: auto;
			padding: var(--space-4);
		}
		.app-alert {
			position: fixed;
			top: 70px;
			right: var(--space-4);
			left: calc(17.5rem + var(--space-4));
			z-index: 20;
		}
		@media (max-width: 900px) {
			.app-shell {
				grid-template-columns: 5rem minmax(0, 1fr);
			}
			.app-alert {
				left: calc(5rem + var(--space-4));
			}
			.titlebar-content {
				grid-template-columns: minmax(0, 1fr) minmax(1rem, 1fr) auto;
				padding-left: var(--space-3);
			}
		}
	}
</style>
