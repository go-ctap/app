<script lang="ts">
  import type { Snippet } from "svelte";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert/index.js";

  interface Props {
    title?: string;
    variant?: "default" | "destructive" | "warning";
    children?: Snippet;
  }

  let { title, variant = "default", children }: Props = $props();
</script>

<Alert
  variant={variant === "destructive" ? "destructive" : "default"}
  class={variant === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100" : undefined}
>
  {#if title}
    <AlertTitle>{title}</AlertTitle>
  {/if}
  <AlertDescription>
    {@render children?.()}
  </AlertDescription>
</Alert>
