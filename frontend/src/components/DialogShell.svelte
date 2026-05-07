<script lang="ts">
  import { createEventDispatcher, onMount, tick } from "svelte";

  export let title = "";
  export let eyebrow = "";
  export let wide = false;
  export let destructive = false;
  export let closeLabel = "Cancel";

  const dispatch = createEventDispatcher<{ close: void; primary: void }>();
  let dialog: HTMLDivElement;
  let restoreTo: Element | null = null;

  function close() {
    dispatch("close");
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
      if (target?.tagName !== "TEXTAREA") {
        const primary = dialog?.querySelector<HTMLElement>("[data-primary]");
        if (primary) {
          event.preventDefault();
          primary.click();
        }
      }
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      const primary = dialog?.querySelector<HTMLElement>("[data-primary]");
      if (primary) {
        event.preventDefault();
        primary.click();
      }
    }
  }

  onMount(async () => {
    restoreTo = document.activeElement;
    await tick();
    const focusTarget = dialog?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]:not([tabindex='-1'])");
    focusTarget?.focus();
    return () => {
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  });
</script>

<div class="modal-backdrop" role="presentation" on:keydown={handleKeydown}>
  <div class:wide class:destructive class="modal" bind:this={dialog} role="dialog" aria-modal="true" aria-label={title}>
    {#if eyebrow}
      <p class="eyebrow">{eyebrow}</p>
    {/if}
    <h2>{title}</h2>
    <slot />
    <slot name="actions">
      <div class="actions">
        <button data-primary class:danger={destructive} type="button" on:click={() => dispatch("primary")}>Continue</button>
        <button class="quiet" type="button" on:click={close}>{closeLabel}</button>
      </div>
    </slot>
  </div>
</div>
