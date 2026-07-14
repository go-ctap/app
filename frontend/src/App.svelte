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
	import { WindowControls, WindowTitlebar } from "$lib/components/window-controls";
	import { toggleMaximizeWindow } from "$lib/components/window-controls/window";
	import {
		bootstrap,
		answerPendingInteraction,
		cancelActiveOperation,
		handleDiscoveryChanged,
		handleInteractionRequested,
		handleOperationProgress,
		navigateToScreen,
		selectToken,
		startDiscoveryMonitoring,
		shutdownWorkbench
	} from "$lib/controller";
	import { currentLocale } from "$lib/i18n";
	import { buildInteractionModalPresentation, buildShellStatusPresentation, buildSidebarPresentation } from "$lib/shell-presentation";
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
	import { detectWindowPlatform, resolveWindowPlatform } from "$lib/window-platform";

	import { m } from "./paraglide/messages.js";
	import Lab from "./screens/Lab.svelte";
	import Overview from "./screens/Overview.svelte";
	import LargeBlobs from "./screens/LargeBlobs.svelte";
	import Passkeys from "./screens/Passkeys.svelte";
	import Security from "./screens/Security.svelte";
	import Settings from "./screens/Settings.svelte";

	let refreshing = $state(false);
	let initialized = $state(false);
	let windowPlatform = $state(detectWindowPlatform());
	let windowActive = $state(true);
	let isMacOS = $derived(windowPlatform === "macos");
	let noDevices = $derived(initialized && !refreshing && $devices.length === 0);
	let sidebarPresentation = $derived(buildSidebarPresentation({
		activeScreen: $activeScreen,
		devices: $devices,
		selectedSelector: $selectedSelector,
		busy: refreshing || $sessionBusy,
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

	async function handleInteractionAnswer(answer: kitservice.InteractionAnswer) {
		await answerPendingInteraction(answer);
	}

	function handleCancelOperation() {
		void cancelActiveOperation();
	}

	async function syncWindowPlatform() {
		const detected = detectWindowPlatform();
		if (detected !== null) {
			windowPlatform = detected;
			return;
		}

		windowPlatform = null;
		try {
			const resolved = await resolveWindowPlatform();
			if (resolved !== null) {
				windowPlatform = resolved;
			}
		} catch {
			// WindowRuntimeReady retries detection without rendering the wrong platform chrome.
		}
	}

	function handleTitlebarDoubleClick(event: MouseEvent) {
		if (!isMacOS || !(event.target instanceof Element)) return;
		if (!event.target.closest('[data-window-titlebar-region="true"]')) return;
		if (event.target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]')) return;

		event.preventDefault();
		void toggleMaximizeWindow();
	}

	onMount(() => {
		let disposed = false;
		const handleWindowFocus = () => windowActive = true;
		const handleWindowBlur = () => windowActive = false;
		windowActive = document.hasFocus();
		window.addEventListener("focus", handleWindowFocus);
		window.addEventListener("blur", handleWindowBlur);
		window.addEventListener("dblclick", handleTitlebarDoubleClick);
		const offRuntimeReady = Events.On(Events.Types.Common.WindowRuntimeReady, () => {
			void syncWindowPlatform();
		});
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
		void syncWindowPlatform();

		bootstrap()
			.then(() => disposed ? undefined : startDiscoveryMonitoring())
			.finally(() => {
				if (disposed) return;
				refreshing = false;
				initialized = true;
			});

		return () => {
			disposed = true;
			window.removeEventListener("focus", handleWindowFocus);
			window.removeEventListener("blur", handleWindowBlur);
			window.removeEventListener("dblclick", handleTitlebarDoubleClick);
			offRuntimeReady();
			offProgress();
			offInteraction();
			offDiscovery();
			void shutdownWorkbench();
		};
	});
</script>

{#if windowPlatform}
	{#key $currentLocale}
	<div class="app-shell" data-platform={windowPlatform} data-window-active={windowActive ? "true" : "false"}>
		<AppSidebar
			presentation={sidebarPresentation}
			nativeWindowTitlebar={isMacOS}
			onNavigate={navigate}
			onSelectToken={handleSelectToken}
		/>

		<section class="app-workspace">
			<header class="app-header">
				<WindowTitlebar>
					<div class="titlebar-content" data-native-window-controls={isMacOS ? "true" : undefined}>
						<h1 class="titlebar-screen-title">{sidebarPresentation.activeScreenLabel}</h1>
						<div class="titlebar-drag-space" aria-hidden="true"></div>
						{#if !isMacOS}
							<WindowControls />
						{/if}
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
				{:else if $activeScreen === "lab"}
					<Lab />
				{:else if $activeScreen === "security"}
					<Security />
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
			/>
		</section>

		<InteractionModal presentation={interactionModalPresentation} onAnswer={handleInteractionAnswer} />
	</div>
	{/key}
{:else}
	<div class="app-platform-pending" aria-hidden="true"></div>
{/if}

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
		.app-platform-pending {
			height: 100dvh;
			background: var(--background);
		}

		.app-shell {
			--sidebar-inline-size: 14rem;
			--sidebar-background: var(--sidebar);
			--topbar-background: var(--card);
			--topbar-border: var(--window-border);
			--statusbar-background: var(--card);
			display: grid;
			grid-template-columns: var(--sidebar-inline-size) minmax(0, 1fr);
			min-width: 0;
			height: 100dvh;
			overflow: hidden;
			border-radius: 0;
			background: var(--window-surface);
			color: var(--foreground);
		}
		.app-workspace {
			container: workspace-shell / inline-size;
			display: grid;
			grid-template-rows: var(--shell-titlebar-block-size) minmax(0, 1fr) auto;
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
			height: var(--shell-titlebar-block-size);
			min-width: 0;
			padding: 0 0 0 var(--space-4);
		}
		.titlebar-drag-space {
			min-width: 0;
			height: 100%;
			--wails-non-client-region: caption;
			--wails-draggable: drag;
		}
		.titlebar-screen-title {
			display: flex;
			align-items: center;
			min-width: 0;
			overflow: hidden;
			font-size: 0.88rem;
			font-weight: 600;
			margin: 0;
			text-overflow: ellipsis;
			white-space: nowrap;
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
			background: var(--workspace-surface);
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

	@layer exceptions {
		.app-shell[data-platform="macos"] {
			--sidebar-background: transparent;
			background: transparent;
		}

		.app-shell[data-platform="macos"][data-window-active="false"] {
			--sidebar-background: color-mix(in srgb, var(--sidebar) 88%, transparent);
		}

		.titlebar-content[data-native-window-controls="true"] {
			grid-template-columns: minmax(0, 38rem) minmax(2rem, 1fr);
			padding-right: var(--space-4);
		}

		@container workspace-shell (max-width: 48rem) {
			.titlebar-content[data-native-window-controls="true"] {
				grid-template-columns: minmax(0, 1fr);
				padding-right: var(--space-3);
			}
		}
	}
</style>
