<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  type Props = {
    title?: string;
    eyebrow?: string;
    wide?: boolean;
    destructive?: boolean;
    closeLabel?: string;
    close?: () => void;
    primary?: () => void;
    children?: Snippet;
    actions?: Snippet;
  };

  let {
    title = "",
    eyebrow = "",
    wide = false,
    destructive = false,
    closeLabel = "Cancel",
    close = () => {},
    primary = () => {},
    children,
    actions,
  }: Props = $props();

  let dialog: HTMLDivElement | null = $state(null);
  let restoreTo: Element | null = null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      close();
    }
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

<Dialog.Root open={true} onOpenChange={handleOpenChange}>
  <Dialog.Content
    bind:ref={dialog}
    class={wide ? "sm:max-w-3xl" : ""}
    showCloseButton={false}
    onkeydown={handleKeydown}
  >
    <Dialog.Header>
      {#if eyebrow}
        <p class="text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
      {/if}
      <Dialog.Title>{title}</Dialog.Title>
    </Dialog.Header>
    {@render children?.()}
    {#if actions}
      {@render actions()}
    {:else}
      <Dialog.Footer>
        <Button data-primary variant={destructive ? "destructive" : "default"} type="button" onclick={primary}>Continue</Button>
        <Button variant="outline" type="button" onclick={close}>{closeLabel}</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
