<script lang="ts">
  import { Copy, Minus, Square, X } from "@lucide/svelte";
  import { Events } from "@wailsio/runtime";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    closeWindow,
    isWindowMaximised,
    minimiseWindow,
    toggleMaximiseWindow,
    type WindowControlsHideMethod,
  } from "./window";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    hide?: boolean;
    hideMethod?: WindowControlsHideMethod;
    justify?: boolean;
    class?: string;
  }

  let {
    hide = false,
    hideMethod = "display",
    justify = false,
    class: className = "",
    ...rest
  }: Props = $props();

  let maximised = $state(false);
  let hiddenState = $derived(hide ? hideMethod : undefined);
  let justifySide = $derived(justify ? "right" : undefined);

  async function refreshMaximisedState() {
    maximised = await isWindowMaximised();
  }

  async function toggleMaximise() {
    await toggleMaximiseWindow();
    await refreshMaximisedState();
  }

  onMount(() => {
    void refreshMaximisedState();

    const offMaximise = Events.On("common:WindowMaximise", () => {
      maximised = true;
    });
    const offUnMaximise = Events.On("common:WindowUnMaximise", () => {
      maximised = false;
    });
    const offRestore = Events.On("common:WindowRestore", () => {
      void refreshMaximisedState();
    });

    return () => {
      offMaximise?.();
      offUnMaximise?.();
      offRestore?.();
    };
  });
</script>

<div
  {...rest}
  data-window-drag-exclude
  class={`window-controls ${className}`}
  data-hidden={hiddenState}
  data-justify={justifySide}
  onpointerdown={(event) => event.stopPropagation()}
>
  <button type="button" style="--wails-app-region: minimize;" aria-label="Minimise window" title="Minimise" onclick={minimiseWindow}>
    <Minus size={13} strokeWidth={2} />
  </button>
  <button type="button" style="--wails-app-region: maximize;" aria-label={maximised ? "Restore window" : "Maximise window"} title={maximised ? "Restore" : "Maximise"} onclick={toggleMaximise}>
    {#if maximised}<Copy size={13} strokeWidth={1.9} />{:else}<Square size={12} strokeWidth={1.9} />{/if}
  </button>
  <button type="button" data-action="close" style="--wails-app-region: close;" aria-label="Close window" title="Close" onclick={closeWindow}>
    <X size={15} strokeWidth={2} />
  </button>
</div>

<style>
  .window-controls {
    display: flex;
    align-items: stretch;
    height: 40px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .window-controls[data-hidden="display"] {
    display: none;
  }

  .window-controls[data-hidden="visibility"] {
    visibility: hidden;
  }

  .window-controls[data-justify="right"] {
    margin-left: auto;
  }

  button {
    width: 46px;
    min-height: 0;
    height: 40px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text);
    padding: 0;
  }

  button:hover:not(:disabled) {
    background: rgb(23 33 29 / 0.07);
  }

  button[data-action="close"]:hover:not(:disabled) {
    background: #c42b1c;
    color: white;
  }
</style>
