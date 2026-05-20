<script lang="ts">
    import type {Snippet} from "svelte";
    import type {HTMLAttributes} from "svelte/elements";
    import {cn} from "$lib/utils";
    import WindowControls from "./WindowControls.svelte";
    import {
        resolveWindowControlsPlatform,
        startWindowDrag,
        type WindowControlsOptions,
        type WindowControlsPlatform,
    } from "./window";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        controlsOrder?: "right" | "left" | "platform" | "system";
        windowControlsProps?: WindowControlsOptions;
        nativeWindowControlsOverlay?: boolean;
        children?: Snippet;
        class?: string;
    }

    let {
        controlsOrder = "system",
        windowControlsProps = {},
        nativeWindowControlsOverlay = false,
        children,
        class: className = "",
        onpointerdown,
        ...rest
    }: Props = $props();

    let platform = $derived(resolveWindowControlsPlatform(windowControlsProps.platform));
    let controlsOnLeft = $derived(
        controlsOrder === "left" ||
        (controlsOrder === "platform" && platform === "macos") ||
        (controlsOrder === "system" && platform === "macos")
    );
    let controlsInsetClass = $derived(controlsOnLeft ? "left-0" : "right-0");
    let contentInsetStyle = $derived(toolbarInsetStyle(platform, controlsOnLeft));
    let windowControlsClass = $derived(cn("absolute top-0 z-20", controlsInsetClass, windowControlsProps.class));
    let titlebarClass = $derived(
        cn(
            "window-titlebar relative block h-full w-full min-w-0 select-none overflow-visible",
            nativeWindowControlsOverlay && "window-titlebar-native-overlay"
        )
    );

    function toolbarInsetStyle(currentPlatform: WindowControlsPlatform, left: boolean) {
        const inset = currentPlatform === "macos" ? "5rem" : "calc(138px + 1rem)";
        return left ? `padding-left: ${inset};` : `padding-right: ${inset};`;
    }

    function handlePointerDown(event: PointerEvent) {
        onpointerdown?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.detail > 1) return;

        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest("[data-window-drag-exclude], button, a, input, select, textarea, [role='button']")) return;

        if (!nativeWindowControlsOverlay) {
            startWindowDrag();
        }
    }
</script>

<div
        {...rest}
        data-window-drag-region
        class={titlebarClass}
        onpointerdown={handlePointerDown}
>
  {#if !nativeWindowControlsOverlay}
    <WindowControls {...windowControlsProps} justify={false} class={windowControlsClass}/>
  {/if}

  <div class={cn("flex h-full min-w-0 flex-row", className)} style={contentInsetStyle}>
    {@render children?.()}
  </div>
</div>

<style>
    .window-titlebar {
      -webkit-app-region: drag;
      app-region: drag;
    }

    .window-titlebar-native-overlay {
      -webkit-user-select: none;
      user-select: none;
    }

    .window-titlebar :global([data-window-drag-exclude] *),
    .window-titlebar :global([data-window-drag-exclude]),
    .window-titlebar :global(button),
    .window-titlebar :global(a),
    .window-titlebar :global(input),
    .window-titlebar :global(select),
    .window-titlebar :global(textarea),
    .window-titlebar :global([role="button"]),
    .window-titlebar :global([contenteditable]) {
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }
</style>
