<script lang="ts">
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import InfoIcon from "@lucide/svelte/icons/info";
  import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import XIcon from "@lucide/svelte/icons/x";

  import { Button } from "$lib/components/ui/button/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import type { ShellStatusPresentation } from "$lib/shell-presentation";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: ShellStatusPresentation;
    onCancel: () => void | Promise<void>;
    onRetry: () => void | Promise<void>;
  };

  let { presentation, onCancel, onRetry }: Props = $props();
</script>

<footer
  class="shell-status-bar"
  data-source={presentation.source}
  data-tone={presentation.tone}
  aria-label={m.current_activity()}
  aria-live="polite"
  aria-atomic="true"
>
  <span class="shell-status-marker" aria-hidden="true">
    {#if presentation.busy && !presentation.progress}
      <Spinner />
    {:else if presentation.tone === "success"}
      <CircleCheckIcon />
    {:else if presentation.tone === "warning" || presentation.tone === "error"}
      <TriangleAlertIcon />
    {:else if presentation.tone === "info"}
      <InfoIcon />
    {:else}
      <CircleIcon />
    {/if}
  </span>

  <span class="shell-status-copy">
    <strong class="shell-status-title" title={presentation.title}>{presentation.title}</strong>
    {#if presentation.detail}
      <span class="shell-status-detail" title={presentation.detail}>{presentation.detail}</span>
    {/if}
  </span>

  {#if presentation.progress}
    <span class="shell-status-progress-wrap">
      <Progress
        class="shell-status-progress"
        value={presentation.progress.value}
        max={presentation.progress.max}
        aria-label={presentation.progress.ariaLabel}
      />
      <span class="shell-status-progress-label">{presentation.progress.label}</span>
    </span>
  {/if}

  {#if presentation.cancel || presentation.retry}
    <span class="shell-status-actions">
      {#if presentation.cancel}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={presentation.cancel.disabled}
          aria-label={presentation.cancel.ariaLabel}
          onclick={() => void onCancel()}
        >
          <XIcon data-icon="inline-start" />
          {presentation.cancel.label}
        </Button>
      {/if}
      {#if presentation.retry}
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={presentation.retry.disabled}
          aria-label={presentation.retry.ariaLabel}
          onclick={() => void onRetry()}
        >
          <RotateCcwIcon data-icon="inline-start" />
          {presentation.retry.label}
        </Button>
      {/if}
    </span>
  {/if}
</footer>

<style>
  @layer blocks {
    .shell-status-bar {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
      min-height: 38px;
      padding: var(--space-1) var(--space-3);
      border-top: 1px solid var(--window-border);
      background: var(--card);
    }

    .shell-status-marker {
      display: grid;
      place-items: center;
      width: 1rem;
      color: var(--muted-foreground);
    }

    .shell-status-marker :global(svg) {
      width: 1rem;
      height: 1rem;
    }

    .shell-status-copy {
      display: flex;
      gap: var(--space-2);
      align-items: baseline;
      min-width: 0;
    }

    .shell-status-title,
    .shell-status-detail,
    .shell-status-progress-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .shell-status-title {
      flex: 0 1 auto;
      min-width: 0;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .shell-status-detail,
    .shell-status-progress-label {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .shell-status-detail {
      flex: 1 1 auto;
      min-width: 0;
    }

    .shell-status-progress-wrap {
      display: grid;
      grid-template-columns: minmax(6rem, 10rem) auto;
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
    }

    :global(.shell-status-progress) {
      min-width: 6rem;
    }

    .shell-status-actions {
      display: flex;
      gap: var(--space-1);
      align-items: center;
    }

    @media (max-width: 760px) {
      .shell-status-detail,
      .shell-status-progress-label {
        display: none;
      }

      .shell-status-progress-wrap {
        grid-template-columns: minmax(4rem, 7rem);
      }
    }
  }

  @layer exceptions {
    .shell-status-bar[data-tone="error"] .shell-status-marker {
      color: var(--destructive);
    }

    .shell-status-bar[data-tone="success"] .shell-status-marker,
    .shell-status-bar[data-tone="info"] .shell-status-marker {
      color: var(--foreground);
    }
  }
</style>
