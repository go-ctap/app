<script lang="ts">
	import { ShieldCheck } from "@lucide/svelte";
	import { Events } from "@wailsio/runtime";
	import { onMount } from "svelte";

	import type * as kitservice from "../bindings/github.com/go-ctap/kit/service/models";

	import InteractionModal from "$lib/components/interaction/InteractionModal.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import ShellStatusBar from "$lib/components/shell/ShellStatusBar.svelte";
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
	import LargeBlobs from "./screens/LargeBlobs.svelte";
	import Passkeys from "./screens/Passkeys.svelte";
	import Settings from "./screens/Settings.svelte";

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
		const offProgress = Events.On("ctapkit:operation-event", (event) => {
			handleOperationProgress(event.data);
		});

		const offInteraction = Events.On("ctapkit:interaction-requested", (event) => {
			handleInteractionRequested(event.data);
		});

		const offDiscovery = Events.On("ctapkit:discovery-changed", (event) => {
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
			offProgress();
			offInteraction();
			offDiscovery();
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

			<main class="main-view">
				{#if $activeScreen === "settings"}
					<Settings />
				{:else if $activeScreen === "large-blobs"}
					<LargeBlobs />
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
	richColors
	expand
	closeButton
	duration={8_000}
	offset={{ bottom: "3.5rem", right: "2rem" }}
	mobileOffset={{ bottom: "3.25rem", right: "1rem" }}
/>

<style>
	@layer blocks {
		.app-shell {
			--sidebar-inline-size: clamp(5rem, 20vw, 17.5rem);
			display: grid;
			grid-template-columns: var(--sidebar-inline-size) minmax(0, 1fr);
			min-width: 0;
			height: 100dvh;
			overflow: hidden;
			border-radius: var(--window-radius);
			background: var(--window-surface);
			color: var(--foreground);
			--topbar-background: transparent;
			--topbar-border: var(--window-border);
		}
		.app-workspace {
			container: workspace-shell / inline-size;
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
			grid-template-columns: minmax(0, 38rem) minmax(2rem, 1fr) auto;
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
			container: workspace / inline-size;
			display: grid;
			min-width: 0;
			min-height: 0;
			overflow: auto;
			scrollbar-gutter: stable;
			padding: var(--space-4);
		}
		@container workspace-shell (max-width: 48rem) {
			.titlebar-content {
				grid-template-columns: minmax(0, 1fr) auto;
				padding-left: var(--space-3);
			}

			.titlebar-drag-space {
				display: none;
			}
		}
	}
</style>
