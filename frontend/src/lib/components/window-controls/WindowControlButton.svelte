<script lang="ts">
  import { System } from "@wailsio/runtime";
  import type { Snippet } from "svelte";

  type Props = {
    label: string;
    region: "minimize" | "maximize" | "close";
    action?: "close";
    onclick?: () => void | Promise<void>;
    children: Snippet;
  };

  let { label, region, action, onclick = () => {}, children }: Props = $props();

  const showNativeTitle = !System.IsWindows();

  let nativeTitle = $derived(showNativeTitle ? label : undefined);
</script>

<button
  class="window-control-button"
  style={`--wails-non-client-region: ${region}`}
  data-window-region={region}
  data-action={action}
  type="button"
  aria-label={label}
  title={nativeTitle}
  {onclick}
>
  {@render children()}
</button>

<style>
  @layer blocks {
    .window-control-button {
      display: grid;
      place-items: center;
      width: 46px;
      height: 100%;
      min-height: 0;
      border: 0;
      background: transparent;
      color: var(--muted-foreground);
      padding: 0;
      --wails-draggable: no-drag;
    }

    .window-control-button:hover {
      background: color-mix(in srgb, var(--foreground) 10%, transparent);
      color: var(--foreground);
    }

    .window-control-button[data-action="close"]:hover {
      background: var(--destructive);
      color: var(--background);
    }

    .window-control-button :global(svg) {
      display: block;
    }
  }
</style>
