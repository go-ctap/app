<script lang="ts">
  import { Copy, Maximize2, Minus, Square, X } from "@lucide/svelte";
  import { Events } from "@wailsio/runtime";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";
  import {
    closeWindow,
    isWindowMaximised,
    minimiseWindow,
    resolveWindowControlsPlatform,
    toggleFullscreenWindow,
    toggleMaximiseWindow,
    type WindowControlsHideMethod,
    type WindowControlsPlatform,
  } from "./window";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    platform?: WindowControlsPlatform | "system";
    hide?: boolean;
    hideMethod?: WindowControlsHideMethod;
    justify?: boolean;
    class?: string;
  }

  let {
    platform = "system",
    hide = false,
    hideMethod = "display",
    justify = false,
    class: className = "",
    ...rest
  }: Props = $props();

  let maximised = $state(false);
  let macHovering = $state(false);
  let altPressed = $state(false);
  let resolvedPlatform = $derived(resolveWindowControlsPlatform(platform));
  let hiddenClass = $derived(hide ? (hideMethod === "display" ? "hidden" : "invisible") : "");
  let justifyClass = $derived(justify ? (resolvedPlatform === "macos" ? "mr-auto" : "ml-auto") : "");

  async function refreshMaximisedState() {
    maximised = await isWindowMaximised();
  }

  async function toggleMaximise() {
    await toggleMaximiseWindow();
    await refreshMaximisedState();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Alt") altPressed = true;
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Alt") altPressed = false;
  }

  onMount(() => {
    void refreshMaximisedState();
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);

    const offMaximise = Events.On("common:WindowMaximise", () => {
      maximised = true;
    });
    const offUnMaximise = Events.On("common:WindowUnMaximise", () => {
      maximised = false;
    });

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
      offMaximise?.();
      offUnMaximise?.();
    };
  });

</script>

{#if resolvedPlatform === "macos"}
  <div
    {...rest}
    data-window-drag-exclude
    class={cn("flex h-8 items-center gap-2 px-3 text-black", hiddenClass, justifyClass, className)}
    onpointerdown={(event) => event.stopPropagation()}
    onmouseenter={() => (macHovering = true)}
    onmouseleave={() => (macHovering = false)}
  >
    <button
      type="button"
      class="grid size-3 place-items-center rounded-full border border-black/10 bg-[#ff5f57] text-black/70 outline-none hover:bg-[#ff5f57] active:bg-[#bf403a]"
      aria-label="Close window"
      title="Close"
      onclick={closeWindow}
    >
      {#if macHovering}
        <X size={8} strokeWidth={3} />
      {/if}
    </button>
    <button
      type="button"
      class="grid size-3 place-items-center rounded-full border border-black/10 bg-[#ffbd2e] text-black/70 outline-none hover:bg-[#ffbd2e] active:bg-[#bf9122]"
      aria-label="Minimise window"
      title="Minimise"
      onclick={minimiseWindow}
    >
      {#if macHovering}
        <Minus size={8} strokeWidth={3} />
      {/if}
    </button>
    <button
      type="button"
      class="grid size-3 place-items-center rounded-full border border-black/10 bg-[#28c840] text-black/70 outline-none hover:bg-[#28c840] active:bg-[#1e9930]"
      aria-label={altPressed ? "Maximise window" : "Toggle fullscreen"}
      title={altPressed ? "Maximise" : "Fullscreen"}
      onclick={altPressed ? toggleMaximise : toggleFullscreenWindow}
    >
      {#if macHovering}
        {#if altPressed}
          <Maximize2 size={7} strokeWidth={3} />
        {:else}
          <Maximize2 size={7} strokeWidth={3} />
        {/if}
      {/if}
    </button>
  </div>
{:else if resolvedPlatform === "gnome"}
  <div
    {...rest}
    data-window-drag-exclude
    class={cn("flex h-10 items-center gap-3 px-2", hiddenClass, justifyClass, className)}
    onpointerdown={(event) => event.stopPropagation()}
  >
    <button
      type="button"
      class="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
      aria-label="Minimise window"
      title="Minimise"
      onclick={minimiseWindow}
    >
      <Minus size={12} strokeWidth={2.2} />
    </button>
    <button
      type="button"
      class="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
      aria-label={maximised ? "Restore window" : "Maximise window"}
      title={maximised ? "Restore" : "Maximise"}
      onclick={toggleMaximise}
    >
      {#if maximised}
        <Copy size={11} strokeWidth={2.2} />
      {:else}
        <Square size={10} strokeWidth={2.2} />
      {/if}
    </button>
    <button
      type="button"
      class="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground outline-none hover:bg-destructive hover:text-white active:bg-destructive/90"
      aria-label="Close window"
      title="Close"
      onclick={closeWindow}
    >
      <X size={12} strokeWidth={2.2} />
    </button>
  </div>
{:else}
  <div
    {...rest}
    data-window-drag-exclude
    class={cn("flex h-10 items-stretch", hiddenClass, justifyClass, className)}
    onpointerdown={(event) => event.stopPropagation()}
  >
    <button
      type="button"
      class="grid w-[46px] place-items-center bg-transparent text-foreground/90 outline-none hover:bg-foreground/[.06] active:bg-foreground/[.04]"
      aria-label="Minimise window"
      title="Minimise"
      onclick={minimiseWindow}
    >
      <Minus size={13} strokeWidth={2} />
    </button>
    <button
      type="button"
      class="grid w-[46px] place-items-center bg-transparent text-foreground/90 outline-none hover:bg-foreground/[.06] active:bg-foreground/[.04]"
      aria-label={maximised ? "Restore window" : "Maximise window"}
      title={maximised ? "Restore" : "Maximise"}
      onclick={toggleMaximise}
    >
      {#if maximised}
        <Copy size={13} strokeWidth={1.9} />
      {:else}
        <Square size={12} strokeWidth={1.9} />
      {/if}
    </button>
    <button
      type="button"
      class="grid w-[46px] place-items-center bg-transparent text-foreground/90 outline-none hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90"
      aria-label="Close window"
      title="Close"
      onclick={closeWindow}
    >
      <X size={15} strokeWidth={2} />
    </button>
  </div>
{/if}
