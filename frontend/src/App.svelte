<script lang="ts">
	import './app.css';

	import { ShieldCheck } from "@lucide/svelte";
	import { Events } from "@wailsio/runtime";
	import { onMount } from "svelte";

	import type * as kitservice from "../bindings/github.com/go-ctap/kit/service/models";

	import InteractionModal from "$lib/components/interaction/InteractionModal.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import ShellStatusBar from "$lib/components/shell/ShellStatusBar.svelte";
	import { Alert } from "$lib/components/ui/alert/index.js";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { AuthenticatorTitlebarControl, WindowControls, WindowTitlebar } from "$lib/components/window-controls";
	import {
		bootstrap,
		answerPendingInteraction,
		cancelActiveOperation,
		handleDiscoveryChanged,
		handleInteractionRequested,
		handleOperationProgress,
		navigateToScreen,
		refreshDiscovery,
		retryLastStatusOutcome,
		selectToken,
		startDiscoveryMonitoring,
		shutdownWorkbench
	} from "$lib/controller";
	import { currentLocale } from "$lib/i18n";
	import { buildAuthenticatorTitlebarPresentation, buildInteractionModalPresentation, buildShellStatusPresentation, buildSidebarPresentation } from "$lib/shell-presentation";
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

	import { m } from "./paraglide/messages.js";
	import Overview from "./screens/Overview.svelte";
	import Passkeys from "./screens/Passkeys.svelte";
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
	}));
	let shellStatusPresentation = $derived(buildShellStatusPresentation({
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
		return refreshDiscovery();
	}

	function handleInteractionAnswer(answer: kitservice.InteractionAnswer) {
		void answerPendingInteraction(answer);
	}

	function handleCancelOperation() {
		void cancelActiveOperation();
	}

	function handleRetryStatusOutcome() {
		void retryLastStatusOutcome();
	}

	onMount(() => {
		let disposed = false;
		const offProgress = Events.On("ctapkit:operation-event", (event: WailsDataEvent<kitservice.OperationEventEnvelope>) => {
			handleOperationProgress(event.data);
		});

		const offInteraction = Events.On("ctapkit:interaction-requested", (event: WailsDataEvent<kitservice.InteractionPrompt>) => {
			handleInteractionRequested(event.data);
		});

		const offDiscovery = Events.On("ctapkit:discovery-changed", (event: WailsDataEvent<kitservice.DiscoveryChangedEnvelope>) => {
			handleDiscoveryChanged(event.data);
		});

		refreshing = true;

		bootstrap()
			.then(() => disposed ? undefined : startDiscoveryMonitoring())
			.finally(() => {
				if (disposed) return;
				refreshing = false;
				initialized = true;
			});

		return () => {
			disposed = true;
			offProgress?.();
			offInteraction?.();
			offDiscovery?.();
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
				{:else if $activeScreen === "passkeys"}
					<Passkeys />
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

			<ShellStatusBar
				presentation={shellStatusPresentation}
				onCancel={handleCancelOperation}
				onRetry={handleRetryStatusOutcome}
			/>
		</section>

		<InteractionModal presentation={interactionModalPresentation} onAnswer={handleInteractionAnswer} />
	</div>
{/key}

<Toaster
	position="bottom-right"
	offset={{ bottom: "3.5rem", right: "2rem" }}
	mobileOffset={{ bottom: "3.25rem", right: "1rem" }}
/>

<style>
	@layer blocks {
		.app-shell {
			display: grid;
			grid-template-columns: 17.5rem minmax(0, 1fr);
			min-width: 0;
			height: 100vh;
			overflow: hidden;
			border-radius: var(--window-radius);
			background: var(--window-surface);
			color: var(--foreground);
			--topbar-background: transparent;
			--topbar-border: var(--window-border);
		}
		.app-workspace {
			display: grid;
			grid-template-rows: 58px minmax(0, 1fr) auto;
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
